begin;
do $$begin if not exists(select from pg_roles where rolname='boletin_extraction_api') then create role boletin_extraction_api nologin noinherit; end if; end$$;
grant boletin_extraction_api to authenticator;
grant usage on schema public to boletin_extraction_api;
alter table public.documents add column manual_keys text[] not null default '{}';
create function private.track_manual_fields() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;
begin
 if new.status<>'draft' then new.manual_keys:='{}';return new;end if;
 if coalesce(current_setting('boletin.extraction_apply',true),'')<>'on' then
  for k in select jsonb_object_keys(old.work_data||new.work_data) loop
   if old.work_data->k is distinct from new.work_data->k and not k=any(new.manual_keys) then new.manual_keys:=array_append(new.manual_keys,k);end if;
  end loop;
 end if;return new;
end;$$;
revoke all on function private.track_manual_fields() from public;
create trigger track_manual_fields before update of work_data on public.documents for each row execute function private.track_manual_fields();
create table private.extraction_usage (
 id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,document_id uuid not null,
 request_id uuid not null,kind text not null check(kind in ('text','photo','audio')),seconds integer not null check(seconds between 0 and 60),created_at timestamptz not null default now(),unique(owner_id,request_id)
);
create index extraction_usage_owner on private.extraction_usage(owner_id,created_at);
revoke all on private.extraction_usage from public,anon,authenticated,service_role,boletin_worker,boletin_extraction_api;
create table public.document_extractions (
 id uuid primary key,document_id uuid not null,owner_id uuid not null,
 locale text not null default 'es' check(locale in ('es','ca')),kind text not null check(kind in ('text','photo','audio')),mime text not null,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),seconds integer not null,
 source_text text,object_path text unique,base_data jsonb not null,
 state text not null check(state in ('upload','pending','processing','ready','failed')),
 result jsonb,transcription text,error text,usage jsonb,attempts integer not null default 0,claim uuid,lease_until timestamptz,
 created_at timestamptz not null default now(),foreign key(document_id,owner_id) references public.documents(id,owner_id) on delete cascade
);
alter table public.document_extractions enable row level security;
revoke all on public.document_extractions from public,anon,authenticated,service_role,boletin_worker,boletin_extraction_api;
grant select(id,document_id,owner_id,kind,mime,object_path,state,result,transcription,error,attempts,created_at) on public.document_extractions to authenticated;
create policy extraction_owner on public.document_extractions for select to authenticated using(owner_id=auth.uid() and private.session_active() and private.document_alive(document_id) and exists(select from public.documents where id=document_id and status='draft'));

create function public.begin_extraction(p_owner uuid,p_session uuid,p_document uuid,p_request uuid,p_kind text,p_mime text,p_sha text,p_text text,p_seconds integer,p_locale text default 'es') returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc public.documents;item public.document_extractions;previous private.extraction_usage;new_id uuid:=gen_random_uuid();ext text;
begin
 if auth.role() is distinct from 'boletin_extraction_api' then raise exception 'not_authorized' using errcode='42501';end if;
 if not exists(select from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_owner and u.email_confirmed_at is not null and(s.not_after is null or s.not_after>now())) then raise exception 'session' using errcode='PT401';end if;
 if p_locale is null or p_locale not in ('es','ca') or p_request is null or p_kind is null or p_kind not in ('text','photo','audio') or p_sha is null or p_sha!~'^[a-f0-9]{64}$' or p_seconds is null then raise exception 'input' using errcode='PT400';end if;
 ext:=case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'audio/wav' then 'wav' end;
 if(p_kind='text' and(p_text is null or char_length(p_text) not between 1 and 6000 or p_mime<>'text/plain' or p_seconds<>0)) or(p_kind<>'text' and(p_text is not null or ext is null)) or(p_kind='photo' and(p_seconds<>0 or p_mime='audio/wav')) or(p_kind='audio' and(p_seconds not between 1 and 60 or p_mime<>'audio/wav')) then raise exception 'input' using errcode='PT400';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select * into doc from public.documents where id=p_document and owner_id=p_owner for update;
 if not found or not private.document_alive(doc.id) then raise exception 'not_found' using errcode='PT404';end if;
 if doc.status<>'draft' then raise exception 'closed' using errcode='PT409';end if;
 select * into previous from private.extraction_usage where owner_id=p_owner and request_id=p_request;
 if found then
  select * into item from public.document_extractions where id=previous.id;
  if item.id is null or item.document_id<>p_document or item.sha256<>p_sha or item.kind<>p_kind or item.mime<>p_mime or item.seconds<>p_seconds then raise exception 'conflict' using errcode='PT409';end if;
  if item.state='failed' and item.attempts=0 and item.error='upload' then update public.document_extractions set state='upload',error=null,created_at=now() where id=item.id returning * into item;end if;
  return jsonb_build_object('id',item.id,'object_path',item.object_path,'state',item.state);
 end if;
 if(select count(*) from private.extraction_usage where document_id=p_document)>=10 or(select count(*) from private.extraction_usage where owner_id=p_owner and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=10 or(p_kind in ('photo','audio') and(select count(*) from private.extraction_usage where document_id=p_document and kind=p_kind)>=5) or(p_kind='audio' and coalesce((select sum(seconds) from private.extraction_usage where owner_id=p_owner and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')),0)+p_seconds>300) then raise exception 'extraction_limit' using errcode='PT429';end if;
 insert into private.extraction_usage(id,owner_id,document_id,request_id,kind,seconds) values(new_id,p_owner,p_document,p_request,p_kind,p_seconds);
 insert into public.document_extractions(id,document_id,owner_id,locale,kind,mime,sha256,seconds,source_text,object_path,base_data,state) values(new_id,p_document,p_owner,p_locale,p_kind,p_mime,p_sha,p_seconds,p_text,case when p_kind<>'text' then p_owner::text||'/'||p_document::text||'/'||new_id::text||'.'||ext end,doc.work_data,case when p_kind='text' then 'pending' else 'upload' end) returning * into item;
 if p_kind='text' then update public.documents set data_started_at=coalesce(data_started_at,private.document_now(owner_id)) where id=p_document;end if;
 return jsonb_build_object('id',item.id,'object_path',item.object_path,'state',item.state);
end;$$;
revoke all on function public.begin_extraction(uuid,uuid,uuid,uuid,text,text,text,text,integer,text) from public,anon,authenticated,service_role,boletin_worker;
grant execute on function public.begin_extraction(uuid,uuid,uuid,uuid,text,text,text,text,integer,text) to boletin_extraction_api;

create function public.finish_source_upload(p_job uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401';end if;
 select * into item from public.document_extractions where id=p_job and owner_id=auth.uid();
 if not found then return false;end if;
 perform 1 from public.documents where id=item.document_id and status='draft' for update;
 if not found or not private.document_alive(item.document_id) then return false;end if;
 if item.state<>'upload' then return item.state in ('pending','processing','ready');end if;
 if not exists(select from storage.objects where bucket_id='sources' and name=item.object_path) then return false;end if;
 update public.document_extractions set state='pending' where id=p_job and state='upload';
 update public.documents set data_started_at=coalesce(data_started_at,private.document_now(owner_id)) where id=item.document_id;
 return true;
end;$$;
revoke all on function public.finish_source_upload(uuid) from public;
grant execute on function public.finish_source_upload(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('sources','sources',false,2097152,array['image/jpeg','image/png','image/webp','audio/wav']);
create function private.extraction_storage_access(p_path text,p_write boolean) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.document_extractions e join public.documents d on d.id=e.document_id where e.object_path=p_path and d.status='draft' and private.document_alive(d.id) and case when auth.role()='boletin_worker' then not p_write and e.state='processing' and e.lease_until>now() else e.owner_id=auth.uid() and private.session_active() and(not p_write or e.state='upload') end);
$$;
revoke all on function private.extraction_storage_access(text,boolean) from public;
grant execute on function private.extraction_storage_access(text,boolean) to authenticated,boletin_worker;
create policy source_upload on storage.objects for insert to authenticated with check(bucket_id='sources' and private.extraction_storage_access(name,true));
create policy source_read on storage.objects for select to authenticated using(bucket_id='sources' and private.extraction_storage_access(name,false));
create policy source_worker on storage.objects for select to boletin_worker using(bucket_id='sources' and private.extraction_storage_access(name,false));
create or replace function private.storage_lifetime(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select case when p_bucket='sources' then private.extraction_storage_access(p_path,false) when p_bucket='documents' then exists(select 1 from public.document_files where object_path=p_path and private.document_alive(document_id)) when p_bucket='previews' then exists(select 1 from private.pdf_jobs where object_path=p_path and private.document_alive(document_id)) or private.final_pdf_access(p_path) else false end;
$$;
create function private.guard_source_object() returns trigger language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;
begin
 if new.bucket_id<>'sources' then return new;end if;
 select * into item from public.document_extractions where object_path=new.name;
 perform 1 from public.documents where id=item.document_id and status='draft' for update;
 if not found or not private.document_alive(item.document_id) or item.state<>'upload' then raise exception 'document_closed' using errcode='42501';end if;
 update public.documents set data_started_at=coalesce(data_started_at,private.document_now(owner_id)) where id=item.document_id;
 return new;
end;$$;
revoke all on function private.guard_source_object() from public;
create trigger source_object_guard before insert on storage.objects for each row execute function private.guard_source_object();
alter table private.validation_cleanup drop constraint validation_cleanup_bucket_check;
alter table private.validation_cleanup add constraint validation_cleanup_bucket_check check(bucket in ('documents','previews','sources'));
create function private.cleanup_extraction_source() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.object_path is not null then insert into private.validation_cleanup(bucket,object_path) values('sources',old.object_path) on conflict do nothing;end if;
 return old;
end;$$;
revoke all on function private.cleanup_extraction_source() from public;
create trigger cleanup_extraction_source before delete on public.document_extractions for each row execute function private.cleanup_extraction_source();
create function private.close_extractions() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='validated' then delete from public.document_extractions where document_id=new.id;end if;
 return new;
end;$$;
revoke all on function private.close_extractions() from public;
create trigger close_extractions after update of status on public.documents for each row execute function private.close_extractions();

create function public.claim_extraction() returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;kind text;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501';end if;
 delete from private.extraction_usage u where u.created_at<now()-interval '2 days' and not exists(select from public.documents d where d.id=u.document_id);
 if not pg_try_advisory_xact_lock(184624010) then return null;end if;
 update public.document_extractions set state=case when attempts>=3 then 'failed' else 'pending' end,error=case when attempts>=3 then 'ai_transport' else error end,claim=null,lease_until=null where state='processing' and lease_until<now();
 update public.document_extractions set state='failed',error='upload' where state='upload' and created_at<now()-interval '15 minutes';
 if exists(select from private.pdf_jobs where state='processing' and lease_until>now()) or exists(select from public.document_extractions where state='processing' and lease_until>now()) then return null;end if;
 select e.* into item from public.document_extractions e join public.documents d on d.id=e.document_id where e.state='pending' and d.status='draft' and private.document_alive(d.id) order by e.created_at for update of e skip locked limit 1;
 if not found then return null;end if;
 update public.document_extractions set state='processing',claim=gen_random_uuid(),attempts=attempts+1,lease_until=now()+interval '180 seconds' where id=item.id returning * into item;
 select type into kind from public.documents where id=item.document_id;
 return to_jsonb(item)||jsonb_build_object('document_type',kind);
end;$$;
revoke all on function public.claim_extraction() from public;
grant execute on function public.claim_extraction() to boletin_worker;
alter function public.claim_brie_job() rename to claim_pdf_before_extraction;
revoke execute on function public.claim_pdf_before_extraction() from boletin_worker;
create function public.claim_brie_job() returns setof private.pdf_jobs language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501';end if;
 if not pg_try_advisory_xact_lock(184624010) or exists(select from public.document_extractions where state='processing' and lease_until>now()) then return;end if;
 return query select * from public.claim_pdf_before_extraction();
end;$$;
revoke all on function public.claim_brie_job() from public;
grant execute on function public.claim_brie_job() to boletin_worker;
create function public.authorize_extraction(p_job uuid,p_claim uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.role()='boletin_worker' and exists(select from public.document_extractions e join public.documents d on d.id=e.document_id where e.id=p_job and e.claim=p_claim and e.state='processing' and e.lease_until>now() and d.status='draft' and private.document_alive(d.id));
$$;
revoke all on function public.authorize_extraction(uuid,uuid) from public;
grant execute on function public.authorize_extraction(uuid,uuid) to boletin_worker;
create function public.finish_extraction(p_job uuid,p_claim uuid,p_result jsonb,p_transcription text,p_usage jsonb,p_error text) returns boolean language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501';end if;
 select * into item from public.document_extractions where id=p_job;
 if not found then return false;end if;
 perform 1 from public.documents where id=item.document_id and status='draft' for update;
 if not found or not private.document_alive(item.document_id) then return false;end if;
 if not public.authorize_extraction(p_job,p_claim) then return false;end if;
 if p_error is not null and p_error not in ('ai_configuration','ai_permission','ai_quota','ai_transport','ai_input','ai_output','integrity') then raise exception 'input';end if;
 if p_error is null and(p_result is null or jsonb_typeof(p_result)<>'object' or octet_length(p_result::text)>64000 or coalesce(char_length(p_transcription),0)>12000) then raise exception 'input';end if;
 update public.document_extractions set state=case when p_error='ai_transport' and attempts<3 then 'pending' when p_error is not null then 'failed' else 'ready' end,result=case when p_error is null then p_result end,transcription=case when p_error is null then p_transcription end,usage=p_usage,error=p_error,claim=null,lease_until=null where id=p_job;
 return true;
end;$$;
revoke all on function public.finish_extraction(uuid,uuid,jsonb,text,jsonb,text) from public;
grant execute on function public.finish_extraction(uuid,uuid,jsonb,text,jsonb,text) to boletin_worker;
create function public.retry_extraction(p_job uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401';end if;
 select * into item from public.document_extractions where id=p_job and owner_id=auth.uid();
 if not found then raise exception 'not_found' using errcode='PT404';end if;
 perform 1 from public.documents where id=item.document_id and status='draft' for update;
 if not found or not private.document_alive(item.document_id) then raise exception 'not_found' using errcode='PT404';end if;
 update public.document_extractions set state='pending',error=null where id=p_job and state='failed' and attempts between 1 and 2;
 return found;
end;$$;
revoke all on function public.retry_extraction(uuid) from public;
grant execute on function public.retry_extraction(uuid) to authenticated;
create function public.apply_extraction(p_job uuid,p_revision integer,p_keys text[]) returns public.documents language plpgsql security definer set search_path='' as $$
declare item public.document_extractions;doc public.documents;proposal jsonb;merged jsonb;k text;
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401';end if;
 select * into item from public.document_extractions where id=p_job and owner_id=auth.uid();
 if not found then raise exception 'not_found' using errcode='PT404';end if;
 select * into doc from public.documents where id=item.document_id for update;
 if doc.status<>'draft' or not private.document_alive(doc.id) then raise exception 'not_found' using errcode='PT404';end if;
 if doc.revision is distinct from p_revision or item.state<>'ready' then raise exception 'conflict' using errcode='PT409';end if;
 if p_keys is null or cardinality(p_keys) not between 1 and 80 or exists(select from unnest(p_keys) x group by x having count(*)>1) then raise exception 'input' using errcode='PT400';end if;
 merged:=doc.work_data;
 foreach k in array p_keys loop
  select x into proposal from jsonb_array_elements(item.result->'fields') x where x->>'key'=k;
  if proposal is null or proposal->'uncertain'<>'false'::jsonb or k=any(doc.manual_keys) or (doc.work_data?k and doc.work_data->k<>'""'::jsonb) or doc.work_data->k is distinct from item.base_data->k then raise exception 'conflict' using errcode='PT409';end if;
  merged:=merged||jsonb_build_object(k,proposal->'value');
 end loop;
 if (doc.type='CIE' and not private.valid_cie_fields(merged)) or (doc.type='BRIE' and not private.valid_document_fields(merged,'BRIE')) then raise exception 'input' using errcode='PT400';end if;
 perform set_config('boletin.extraction_apply','on',true);
 update public.documents set work_data=merged,revision=revision+1,data_started_at=coalesce(data_started_at,private.document_now(owner_id)) where id=doc.id returning * into doc;
 perform set_config('boletin.extraction_apply','off',true);
 return doc;
end;$$;
revoke all on function public.apply_extraction(uuid,integer,text[]) from public;
grant execute on function public.apply_extraction(uuid,integer,text[]) to authenticated;
insert into private.schema_migrations(version) values('007-extraction');
notify pgrst,'reload schema';
commit;
