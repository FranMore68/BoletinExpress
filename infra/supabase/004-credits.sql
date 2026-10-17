begin;
create table public.credit_accounts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check(balance>=0),updated_at timestamptz not null default now()
);
create table public.credit_movements (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null check(amount<>0),balance_after integer not null check(balance_after>=0),
 kind text not null check(kind in ('welcome','validation')),operation_key text not null unique,
 document_id uuid references public.documents(id) on delete set null,created_at timestamptz not null default now()
);
create unique index one_document_charge on public.credit_movements(document_id) where kind='validation';
create index credit_movements_owner on public.credit_movements(owner_id,created_at desc);
alter table public.credit_accounts enable row level security;
alter table public.credit_movements enable row level security;
revoke all on public.credit_accounts,public.credit_movements from public,anon,authenticated,service_role,boletin_worker;
grant select on public.credit_accounts,public.credit_movements to authenticated;
create policy credits_owner on public.credit_accounts for select to authenticated using(owner_id=auth.uid() and private.session_active());
create policy movements_owner on public.credit_movements for select to authenticated using(owner_id=auth.uid() and private.session_active());
create function private.grant_welcome(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
declare credited boolean; current_balance int;
begin
 if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null) then return; end if;
 insert into public.credit_accounts(owner_id) values(p_owner) on conflict do nothing;
 select balance into current_balance from public.credit_accounts where owner_id=p_owner for update;
 insert into public.credit_movements(owner_id,amount,balance_after,kind,operation_key)
 values(p_owner,10,current_balance+10,'welcome','welcome:'||p_owner::text) on conflict(operation_key) do nothing;
 credited:=found;
 if credited then update public.credit_accounts set balance=balance+10,updated_at=now() where owner_id=p_owner; end if;
end;$$;
revoke all on function private.grant_welcome(uuid) from public,anon,authenticated,service_role,boletin_worker;
create function private.on_email_confirmed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null then perform private.grant_welcome(new.id); end if;
 return new;
end;$$;
revoke all on function private.on_email_confirmed() from public,anon,authenticated,service_role,boletin_worker;
create trigger boletin_welcome after insert or update of email_confirmed_at on auth.users for each row execute function private.on_email_confirmed();
-- Concesión única también para las cuentas de evaluación confirmadas antes de fase 6.
do $$declare u record; begin for u in select id from auth.users where email_confirmed_at is not null loop perform private.grant_welcome(u.id); end loop; end$$;

create table public.validated_documents (
 document_id uuid primary key references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,revision integer not null,
 object_path text not null unique,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 cost integer not null check(cost in (2,5)),validated_at timestamptz not null default now()
);
alter table public.validated_documents enable row level security;
revoke all on public.validated_documents from public,anon,authenticated,service_role,boletin_worker;
grant select on public.validated_documents to authenticated;
create policy validated_owner on public.validated_documents for select to authenticated using(owner_id=auth.uid() and private.session_active());
create function private.final_pdf_access(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.validated_documents v where v.object_path=p_path and v.owner_id=auth.uid()
 and v.validated_at>now()-interval '30 days' and private.session_active());
$$;
revoke all on function private.final_pdf_access(text) from public,anon,authenticated,service_role,boletin_worker;
grant execute on function private.final_pdf_access(text) to authenticated;
create policy final_pdf_read on storage.objects for select to authenticated using(bucket_id='previews' and private.final_pdf_access(name));

create table private.validation_cleanup (
 id uuid primary key default gen_random_uuid(),bucket text not null check(bucket in ('documents','previews')),object_path text not null,
 unique(bucket,object_path)
);
revoke all on private.validation_cleanup from public,anon,authenticated,service_role,boletin_worker;
create function private.validation_cleanup_access(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.role()='boletin_worker' and exists(select 1 from private.validation_cleanup where bucket=p_bucket and object_path=p_path)
 and not exists(select 1 from public.validated_documents where object_path=p_path);
$$;
revoke all on function private.validation_cleanup_access(text,text) from public,anon,authenticated,service_role;
grant execute on function private.validation_cleanup_access(text,text) to boletin_worker;
create policy validation_cleanup_read on storage.objects for select to boletin_worker using(private.validation_cleanup_access(bucket_id,name));
create policy validation_cleanup_delete on storage.objects for delete to boletin_worker using(private.validation_cleanup_access(bucket_id,name));
create function public.validation_cleanup_tasks() returns setof private.validation_cleanup
language sql stable security definer set search_path='' as $$
 select * from private.validation_cleanup where auth.role()='boletin_worker' limit 8;
$$;
revoke all on function public.validation_cleanup_tasks() from public,anon,authenticated,service_role;
grant execute on function public.validation_cleanup_tasks() to boletin_worker;
create function public.finish_validation_cleanup(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 delete from private.validation_cleanup t where id=p_id and not exists(select 1 from storage.objects o where o.bucket_id=t.bucket and o.name=t.object_path);
 return found;
end;$$;
revoke all on function public.finish_validation_cleanup(uuid) from public,anon,authenticated,service_role;
grant execute on function public.finish_validation_cleanup(uuid) to boletin_worker;

DO $$begin if not exists(select from pg_roles where rolname='boletin_credits_api') then create role boletin_credits_api nologin noinherit; end if; end$$;
grant boletin_credits_api to authenticator;
grant usage on schema public to boletin_credits_api;
create function public.validate_document(p_owner uuid,p_session uuid,p_document uuid,p_revision integer,p_sha text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc public.documents; artifact public.document_previews; final public.validated_documents; account public.credit_accounts; price int;
begin
 if auth.role() is distinct from 'boletin_credits_api' then raise exception 'not_authorized' using errcode='42501'; end if;
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_owner and u.email_confirmed_at is not null and (s.not_after is null or s.not_after>now())) then raise exception 'session' using errcode='PT401'; end if;
 -- Orden fijo: cuenta, documento. Todas las validaciones de una cuenta se serializan.
 select * into account from public.credit_accounts where owner_id=p_owner for update;
 if not found then raise exception 'unavailable' using errcode='PT503'; end if;
 select * into doc from public.documents where id=p_document and owner_id=p_owner for update;
 if not found then raise exception 'not_found' using errcode='PT404'; end if;
 if doc.revision is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 if doc.status='validated' then
  select * into final from public.validated_documents where document_id=doc.id and sha256=p_sha;
  if not found then raise exception 'conflict' using errcode='PT409'; end if;
  return jsonb_build_object('document',to_jsonb(doc),'balance',account.balance,'artifact',to_jsonb(final),'alreadyValidated',true);
 end if;
 select * into artifact from public.document_previews where document_id=doc.id and revision=doc.revision and status='ready' and sha256=p_sha;
 if not found or p_sha is null or not exists(select 1 from storage.objects where bucket_id='previews' and name=artifact.object_path) then raise exception 'pdf_not_ready' using errcode='PT409'; end if;
 price:=case doc.type when 'BRIE' then 2 when 'CIE' then 5 end;
 if account.balance<price then raise exception 'insufficient_credits' using errcode='PT402'; end if;
 update public.credit_accounts set balance=balance-price,updated_at=now() where owner_id=p_owner returning * into account;
 insert into public.credit_movements(owner_id,amount,balance_after,kind,operation_key,document_id)
 values(p_owner,-price,account.balance,'validation','validation:'||doc.id::text,doc.id);
 insert into public.validated_documents(document_id,owner_id,revision,object_path,sha256,cost)
 values(doc.id,p_owner,doc.revision,artifact.object_path,p_sha,price) returning * into final;
 update public.documents set status='validated',validated_at=final.validated_at,work_data='{}' where id=doc.id returning * into doc;
 -- Retirada inmediata del acceso a fuentes y vistas previas. El worker borra sus objetos con reintentos.
 insert into private.validation_cleanup(bucket,object_path) select 'documents',object_path from public.document_files where document_id=doc.id on conflict do nothing;
 insert into private.validation_cleanup(bucket,object_path) select 'previews',object_path from private.pdf_jobs where document_id=doc.id and object_path<>final.object_path on conflict do nothing;
 delete from public.document_files where document_id=doc.id;
 delete from private.pdf_jobs where document_id=doc.id;
 return jsonb_build_object('document',to_jsonb(doc),'balance',account.balance,'artifact',to_jsonb(final),'alreadyValidated',false);
end;$$;
revoke all on function public.validate_document(uuid,uuid,uuid,integer,text) from public,anon,authenticated,service_role,boletin_worker;
grant execute on function public.validate_document(uuid,uuid,uuid,integer,text) to boletin_credits_api;
-- Serializar el alta de objetos con el cierre: una carga en curso no puede dejar fuentes huérfanas.
create function private.guard_document_object() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if new.bucket_id='documents' then
  select document_id into target from public.document_files where object_path=new.name;
 elsif new.bucket_id='previews' then
  select document_id into target from private.pdf_jobs where object_path=new.name;
 else return new;
 end if;
 perform 1 from public.documents where id=target and status='draft' for share;
 if not found then raise exception 'document_closed' using errcode='42501'; end if;
 return new;
end;$$;
revoke all on function private.guard_document_object() from public,anon,authenticated,service_role,boletin_worker;
create trigger document_object_guard before insert on storage.objects for each row execute function private.guard_document_object();

insert into private.schema_migrations(version) values('004-credits');
notify pgrst,'reload schema';
commit;
