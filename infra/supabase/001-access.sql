begin;
create schema if not exists private;
revoke all on schema private from public;
create table if not exists private.schema_migrations(version text primary key, applied_at timestamptz not null default now());
grant usage on schema private to authenticated;

create or replace function private.session_active() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id
 where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid()
 and u.email_confirmed_at is not null and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function private.session_active() from public;
grant execute on function private.session_active() to authenticated;

create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 type text not null check(type in ('BRIE','CIE')),
 title text not null check(char_length(title) between 1 and 100),
 status text not null default 'draft' check(status in ('draft','validated')),
 work_data jsonb not null default '{}',
 created_at timestamptz not null default now(),
 validated_at timestamptz,
 unique(id,owner_id)
);
create index if not exists documents_owner on public.documents(owner_id);
alter table public.documents enable row level security;
revoke all on public.documents from anon,authenticated;
grant select on public.documents to authenticated;
create policy documents_owner_read on public.documents for select to authenticated
 using(owner_id=auth.uid() and private.session_active());

create table if not exists public.document_files (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null unique,
 ready boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key(document_id,owner_id) references public.documents(id,owner_id) on delete cascade
);
create index if not exists files_owner_document on public.document_files(owner_id,document_id);
alter table public.document_files enable row level security;
revoke all on public.document_files from anon,authenticated;
grant select on public.document_files to authenticated;
create policy files_owner_read on public.document_files for select to authenticated
 using(owner_id=auth.uid() and private.session_active());

create or replace function public.session_active() returns boolean
 language sql stable security invoker set search_path='' as $$select private.session_active();$$;
revoke all on function public.session_active() from public;
grant execute on function public.session_active() to authenticated;

create or replace function public.create_document(p_type text,p_title text) returns public.documents
language plpgsql security definer set search_path='' as $$
declare result public.documents;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.documents where owner_id=auth.uid() and status='draft')>=3
 then raise exception 'draft_limit' using errcode='23514'; end if;
 insert into public.documents(type,title,owner_id) values(p_type,p_title,auth.uid()) returning * into result;
 return result;
end;$$;
revoke all on function public.create_document(text,text) from public;
grant execute on function public.create_document(text,text) to authenticated;

create or replace function public.reserve_file(p_document uuid) returns public.document_files
language plpgsql security definer set search_path='' as $$
declare result public.document_files; file_id uuid := gen_random_uuid();
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform 1 from public.documents where id=p_document and owner_id=auth.uid() and status='draft' for update;
 if not found then raise exception 'not_found' using errcode='42501'; end if;
 if (select count(*) from public.document_files where document_id=p_document)>=5
 then raise exception 'file_limit' using errcode='23514'; end if;
 insert into public.document_files(id,document_id,owner_id,object_path)
 values(file_id,p_document,auth.uid(),auth.uid()::text||'/'||p_document::text||'/'||file_id::text||'.pdf') returning * into result;
 return result;
end;$$;
revoke all on function public.reserve_file(uuid) from public;
grant execute on function public.reserve_file(uuid) to authenticated;

create or replace function public.finish_file(p_file uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 update public.document_files f set ready=true where f.id=p_file and f.owner_id=auth.uid()
 and exists(select 1 from public.documents d where d.id=f.document_id and d.owner_id=auth.uid() and d.status='draft')
 and exists(select 1 from storage.objects o where o.bucket_id='documents' and o.name=f.object_path);
 return found;
end;$$;
revoke all on function public.finish_file(uuid) from public;
grant execute on function public.finish_file(uuid) to authenticated;

-- Only own uncompleted reservations can be removed after a failed upload.
create or replace function public.cancel_file(p_file uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 delete from public.document_files where id=p_file and owner_id=auth.uid() and not ready;
 return found;
end;$$;
revoke all on function public.cancel_file(uuid) from public;
grant execute on function public.cancel_file(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('documents','documents',false,2097152,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=array['application/pdf'];
create policy documents_upload on storage.objects for insert to authenticated
 with check(bucket_id='documents' and private.session_active() and exists(
 select 1 from public.document_files f join public.documents d on d.id=f.document_id
 where f.object_path=name and f.owner_id=auth.uid() and not f.ready and d.status='draft'));
create policy documents_download on storage.objects for select to authenticated
 using(bucket_id='documents' and private.session_active() and exists(
 select 1 from public.document_files f join public.documents d on d.id=f.document_id
 where f.object_path=name and f.owner_id=auth.uid() and
 (d.status='draft' or (d.status='validated' and d.validated_at>now()-interval '30 days'))));
-- No UPDATE/DELETE policies and no public bucket: cannot replace or relocate files.

create table if not exists private.auth_attempts(key text primary key,started_at timestamptz not null,hits integer not null);
create index if not exists auth_attempts_expiry on private.auth_attempts(started_at);
create or replace function public.consume_auth_attempt(p_key text) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_key)<>64 then return false; end if;
 delete from private.auth_attempts where started_at<now()-interval '1 day';
 insert into private.auth_attempts values('global',now(),1)
 on conflict(key) do update set
 hits=case when private.auth_attempts.started_at<now()-interval '1 minute' then 1 else private.auth_attempts.hits+1 end,
 started_at=case when private.auth_attempts.started_at<now()-interval '1 minute' then now() else private.auth_attempts.started_at end
 returning hits into n;
 if n>100 then return false; end if;
 insert into private.auth_attempts values(p_key,now(),1)
 on conflict(key) do update set
 hits=case when private.auth_attempts.started_at<now()-interval '1 minute' then 1 else private.auth_attempts.hits+1 end,
 started_at=case when private.auth_attempts.started_at<now()-interval '1 minute' then now() else private.auth_attempts.started_at end
 returning hits into n;
 return n<=5;
end;$$;
revoke all on function public.consume_auth_attempt(text) from public;
grant execute on function public.consume_auth_attempt(text) to anon,authenticated;
insert into private.schema_migrations(version) values('001-access') on conflict do nothing;
notify pgrst,'reload schema';
commit;
