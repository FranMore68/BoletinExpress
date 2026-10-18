begin;
-- El reloj documental es por cuenta ficticia; Auth, leases y pagos usan siempre now().
create table private.evaluation_clocks (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 offset_seconds bigint not null default 0 check(offset_seconds between 0 and 7776000)
);
create function private.fictional_clock_only() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=new.owner_id and email like '%@example.invalid' and email_confirmed_at is not null) then raise exception 'fictional_only'; end if;
 if TG_OP='UPDATE' and new.offset_seconds<old.offset_seconds then raise exception 'forward_only'; end if;
 return new;
end;$$;
revoke all on function private.fictional_clock_only() from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
create trigger fictional_clock_only before insert or update on private.evaluation_clocks for each row execute function private.fictional_clock_only();
revoke all on private.evaluation_clocks from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
create function private.document_now(p_owner uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select now()+coalesce((select offset_seconds from private.evaluation_clocks where owner_id=p_owner),0)*interval '1 second';
$$;
revoke all on function private.document_now(uuid) from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;

alter table public.documents add column draft_expires_at timestamptz;
alter table public.documents add column renewal_active boolean not null default false;
update public.documents set draft_expires_at=data_started_at+interval '24 hours' where status='draft' and data_started_at is not null;
alter table public.credit_movements drop constraint credit_movements_kind_check;
alter table public.credit_movements add constraint credit_movements_kind_check check(kind in ('welcome','validation','renewal'));
create function private.document_alive(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.documents d where d.id=p_id and
 case when d.status='draft' then d.draft_expires_at is null or d.draft_expires_at>private.document_now(d.owner_id)
 else d.validated_at+interval '60 days'>private.document_now(d.owner_id) end);
$$;
revoke all on function private.document_alive(uuid) from public,anon,authenticated,service_role;
grant execute on function private.document_alive(uuid) to authenticated,boletin_worker;
-- Las políticas restrictivas se combinan con las políticas de propietario existentes.
create policy document_lifetime on public.documents as restrictive for select to authenticated using(private.document_alive(id));
create policy file_lifetime on public.document_files as restrictive for select to authenticated using(private.document_alive(document_id));
create policy preview_lifetime on public.document_previews as restrictive for select to authenticated using(private.document_alive(document_id));
create policy final_lifetime on public.validated_documents as restrictive for select to authenticated using(private.document_alive(document_id));

create function private.document_lifetime_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.status='draft' and old.draft_expires_at<=private.document_now(old.owner_id)
 and coalesce(current_setting('boletin.retention_worker',true),'')<>'on' then
  raise exception 'expired' using errcode='PT410';
 end if;
 if TG_OP='INSERT' then
  if new.data_started_at is not null then new.data_started_at:=private.document_now(new.owner_id); end if;
 elsif old.data_started_at is null and new.data_started_at is not null then
  new.data_started_at:=private.document_now(new.owner_id);
 end if;
 if new.status='draft' and new.data_started_at is not null and new.draft_expires_at is null then
  new.draft_expires_at:=new.data_started_at+interval '24 hours';
 end if;
 return new;
end;$$;
revoke all on function private.document_lifetime_guard() from public,anon,authenticated,service_role,boletin_worker;
create trigger document_lifetime_guard before insert or update on public.documents for each row execute function private.document_lifetime_guard();
-- La misma comprobación antes de cobrar; el bloqueo de documento se conserva hasta commit.
create function private.validation_lifetime_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not private.document_alive(new.document_id) then raise exception 'expired' using errcode='PT410'; end if;
 new.validated_at:=private.document_now(new.owner_id);
 return new;
end;$$;
revoke all on function private.validation_lifetime_guard() from public,anon,authenticated,service_role,boletin_worker;
create trigger validation_lifetime_guard before insert on public.validated_documents for each row execute function private.validation_lifetime_guard();

create function public.document_time() returns timestamptz
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401'; end if;
 return private.document_now(auth.uid());
end;$$;
revoke all on function public.document_time() from public,anon,service_role,boletin_worker,boletin_credits_api;
grant execute on function public.document_time() to authenticated;
create function public.reopen_document(p_document uuid) returns public.documents
language plpgsql security definer set search_path='' as $$
declare doc public.documents;
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401'; end if;
 select * into doc from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found or not private.document_alive(doc.id) then raise exception 'not_found' using errcode='PT404'; end if;
 if doc.status='draft' and doc.draft_expires_at is not null then
  update public.documents set renewal_active=true where id=doc.id returning * into doc;
 end if;
 return doc;
end;$$;
revoke all on function public.reopen_document(uuid) from public,anon,service_role,boletin_worker,boletin_credits_api;
grant execute on function public.reopen_document(uuid) to authenticated;

create or replace function private.final_pdf_access(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.validated_documents v where v.object_path=p_path and v.owner_id=auth.uid()
 and v.validated_at+interval '30 days'>private.document_now(v.owner_id) and private.session_active());
$$;
create function private.storage_lifetime(p_bucket text,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select case when p_bucket='documents' then exists(select 1 from public.document_files where object_path=p_path and private.document_alive(document_id))
 when p_bucket='previews' then exists(select 1 from private.pdf_jobs where object_path=p_path and private.document_alive(document_id))
 or private.final_pdf_access(p_path) else false end;
$$;
revoke all on function private.storage_lifetime(text,text) from public,anon,service_role,boletin_worker;
grant execute on function private.storage_lifetime(text,text) to authenticated;
create policy user_storage_lifetime on storage.objects as restrictive for select to authenticated using(private.storage_lifetime(bucket_id,name));
-- Evita nuevas reservas, jobs y objetos después del vencimiento aunque el worker esté parado.
create function private.draft_child_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.documents where id=new.document_id and status='draft' for share;
 if not found or not private.document_alive(new.document_id) then raise exception 'expired' using errcode='PT410'; end if;
 return new;
end;$$;
revoke all on function private.draft_child_guard() from public,anon,authenticated,service_role,boletin_worker;
create trigger file_lifetime_guard before insert or update on public.document_files for each row execute function private.draft_child_guard();
create trigger job_lifetime_guard before insert on private.pdf_jobs for each row execute function private.draft_child_guard();
create or replace function private.guard_document_object() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if new.bucket_id='documents' then select document_id into target from public.document_files where object_path=new.name;
 elsif new.bucket_id='previews' then select document_id into target from private.pdf_jobs where object_path=new.name;
 else return new; end if;
 perform 1 from public.documents where id=target and status='draft' for update;
 if not found or not private.document_alive(target) then raise exception 'document_closed' using errcode='42501'; end if;
 if new.bucket_id='documents' then
  update public.documents set data_started_at=coalesce(data_started_at,private.document_now(owner_id)) where id=target;
 end if;
 return new;
end;$$;

create table private.document_mail (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,request_key text not null,
 locale text not null check(locale in ('es','ca')),recipient text not null,
 state text not null default 'pending' check(state in ('pending','processing','sent','failed')),
 attempts integer not null default 0,claim uuid,lease_until timestamptz,
 first_attempt_at timestamptz,next_attempt_at timestamptz not null default now(),
 provider_id text,last_error text,created_at timestamptz not null default now(),sent_at timestamptz,
 unique(document_id,request_key)
);
revoke all on private.document_mail from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
create function public.request_document_email(p_document uuid,p_request uuid,p_locale text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc public.documents; task private.document_mail; recipient text;
begin
 if not private.session_active() then raise exception 'session' using errcode='PT401'; end if;
 if p_locale not in ('es','ca') then raise exception 'input' using errcode='22023'; end if;
 select * into doc from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found or doc.status<>'validated' or not private.document_alive(doc.id) then raise exception 'not_found' using errcode='PT404'; end if;
 select * into task from private.document_mail where document_id=doc.id and request_key=p_request::text;
 if not found then
  if exists(select 1 from private.document_mail where document_id=doc.id and request_key<>'archive' and created_at>now()-interval '1 hour') then raise exception 'rate' using errcode='PT429'; end if;
  select email into recipient from auth.users where id=auth.uid() and email_confirmed_at is not null;
  insert into private.document_mail(document_id,owner_id,request_key,locale,recipient)
  values(doc.id,auth.uid(),p_request::text,p_locale,recipient) returning * into task;
 end if;
 return jsonb_build_object('id',task.id,'state',task.state);
end;$$;
revoke all on function public.request_document_email(uuid,uuid,text) from public,anon,service_role,boletin_worker,boletin_credits_api;
grant execute on function public.request_document_email(uuid,uuid,text) to authenticated;

create function private.retire_document(p_document uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into private.validation_cleanup(bucket,object_path) select 'documents',object_path from public.document_files where document_id=p_document on conflict do nothing;
 insert into private.validation_cleanup(bucket,object_path) select 'previews',object_path from private.pdf_jobs where document_id=p_document on conflict do nothing;
 insert into private.validation_cleanup(bucket,object_path) select 'previews',object_path from public.validated_documents where document_id=p_document on conflict do nothing;
 delete from public.documents where id=p_document;
end;$$;
revoke all on function private.retire_document(uuid) from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
create function public.process_retention() returns jsonb
language plpgsql security definer set search_path='' as $$
declare candidate record; doc public.documents; account public.credit_accounts; t timestamptz; renewed int:=0; deleted int:=0; queued int:=0;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 if not pg_try_advisory_xact_lock(184624018) then return '{}'::jsonb; end if;
 perform set_config('boletin.retention_worker','on',true);
 for candidate in select id,owner_id from public.documents d where
 (status='draft' and draft_expires_at<=private.document_now(owner_id)) or
 (status='validated' and validated_at+interval '30 days'<=private.document_now(owner_id)
 and (validated_at+interval '60 days'<=private.document_now(owner_id) or not exists(select 1 from private.document_mail m where m.document_id=d.id and request_key='archive')))
 order by owner_id,id limit 50 loop
  -- Mismo orden que la validación: cuenta y documento; evita cobros cruzados.
  select * into account from public.credit_accounts where owner_id=candidate.owner_id for update;
  select * into doc from public.documents where id=candidate.id for update;
  if not found then continue; end if;
  t:=private.document_now(doc.owner_id);
  if doc.status='draft' and doc.draft_expires_at<=t then
   if doc.renewal_active and account.balance>=1 and t<doc.draft_expires_at+interval '24 hours' then
    update public.credit_accounts set balance=balance-1,updated_at=now() where owner_id=doc.owner_id returning * into account;
    insert into public.credit_movements(owner_id,amount,balance_after,kind,operation_key,document_id)
    values(doc.owner_id,-1,account.balance,'renewal','renewal:'||doc.id::text||':'||extract(epoch from doc.draft_expires_at)::text,doc.id);
    update public.documents set draft_expires_at=draft_expires_at+interval '24 hours',renewal_active=false where id=doc.id;
    renewed:=renewed+1;
   else perform private.retire_document(doc.id); deleted:=deleted+1; end if;
  elsif doc.status='validated' then
   if doc.validated_at+interval '60 days'<=t then perform private.retire_document(doc.id); deleted:=deleted+1;
   elsif doc.validated_at+interval '30 days'<=t then
    insert into private.document_mail(document_id,owner_id,request_key,locale,recipient)
    select doc.id,doc.owner_id,'archive','es',email from auth.users where id=doc.owner_id and email_confirmed_at is not null on conflict do nothing;
    if found then queued:=queued+1; end if;
   end if;
  end if;
 end loop;
 return jsonb_build_object('renewed',renewed,'deleted',deleted,'queued',queued);
end;$$;
revoke all on function public.process_retention() from public,anon,authenticated,service_role,boletin_credits_api;
grant execute on function public.process_retention() to boletin_worker;
create function public.claim_document_mail() returns jsonb
language plpgsql security definer set search_path='' as $$
declare task private.document_mail; artifact public.validated_documents;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 if not pg_try_advisory_xact_lock(184624019) then return null; end if;
 -- No reintentar fuera de la ventana de idempotencia del proveedor (24 h).
 update private.document_mail set state='failed',last_error='retry_window' where state in ('pending','processing') and first_attempt_at<now()-interval '20 hours' and (lease_until is null or lease_until<now());
 if exists(select 1 from private.document_mail where state='processing' and lease_until>now()) then return null; end if;
 select m.* into task from private.document_mail m join auth.users u on u.id=m.owner_id
 where ((m.state='pending' and m.next_attempt_at<=now()) or (m.state='processing' and m.lease_until<now()))
 and u.email=m.recipient and u.email_confirmed_at is not null and private.document_alive(m.document_id)
 order by m.created_at for update of m skip locked limit 1;
 if not found then return null; end if;
 update private.document_mail set state='processing',attempts=attempts+1,claim=gen_random_uuid(),lease_until=now()+interval '120 seconds',first_attempt_at=coalesce(first_attempt_at,now()) where id=task.id returning * into task;
 select * into artifact from public.validated_documents where document_id=task.document_id;
 return to_jsonb(task)||jsonb_build_object('object_path',artifact.object_path,'sha256',artifact.sha256);
end;$$;
revoke all on function public.claim_document_mail() from public,anon,authenticated,service_role,boletin_credits_api;
grant execute on function public.claim_document_mail() to boletin_worker;
create function public.finish_document_mail(p_id uuid,p_claim uuid,p_provider text,p_error text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_error is not null and p_error not in ('transport','pdf_integrity','configuration','retry_window') then raise exception 'input'; end if;
 update private.document_mail set state=case when p_error is null then 'sent' when attempts>=12 then 'failed' else 'pending' end,
 provider_id=left(p_provider,200),last_error=p_error,sent_at=case when p_error is null then now() end,
 next_attempt_at=now()+least(3600,60*power(2,least(attempts,6))) * interval '1 second',claim=null,lease_until=null
 where id=p_id and claim=p_claim and state='processing' and lease_until>now() and private.document_alive(document_id);
 return found;
end;$$;
revoke all on function public.finish_document_mail(uuid,uuid,text,text) from public,anon,authenticated,service_role,boletin_credits_api;
grant execute on function public.finish_document_mail(uuid,uuid,text,text) to boletin_worker;
create function private.mail_pdf_access(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.role()='boletin_worker' and exists(select 1 from private.document_mail m join public.validated_documents v on v.document_id=m.document_id
 where v.object_path=p_path and m.state='processing' and m.lease_until>now() and private.document_alive(m.document_id));
$$;
revoke all on function private.mail_pdf_access(text) from public,anon,authenticated,service_role,boletin_credits_api;
grant execute on function private.mail_pdf_access(text) to boletin_worker;
create policy worker_mail_read on storage.objects for select to boletin_worker using(bucket_id='previews' and private.mail_pdf_access(name));

-- Únicamente el administrador local autoriza cuentas ficticias e incrementa este reloj.
-- No existe ruta HTTP, permiso del usuario, worker ni credencial en el frontal.
-- También las lecturas internas y los reintentos de vistas previas respetan el plazo.
DO $migration$
declare f text; signature text;
begin
 foreach signature in array array['public.request_brie_preview(uuid,integer,boolean)','public.request_cie_preview(uuid,integer,boolean)'] loop
  f:=pg_get_functiondef(signature::regprocedure);
  f:=replace(f,'if doc.status<>''draft'' then','if not private.document_alive(doc.id) then raise exception ''expired'' using errcode=''PT410''; end if; if doc.status<>''draft'' then');
  execute f;
 end loop;
 f:=pg_get_functiondef('private.preview_storage_access(text,boolean)'::regprocedure);
 f:=replace(f,'where j.object_path=p_path and d.status=', 'where private.document_alive(d.id) and j.object_path=p_path and d.status=');
 execute f;
end;$migration$;
create function public.authorize_document_mail(p_id uuid,p_claim uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.role()='boletin_worker' and exists(select 1 from private.document_mail m join auth.users u on u.id=m.owner_id
 where m.id=p_id and m.claim=p_claim and m.state='processing' and m.lease_until>now()
 and private.document_alive(m.document_id) and u.email=m.recipient and u.email_confirmed_at is not null);
$$;
revoke all on function public.authorize_document_mail(uuid,uuid) from public,anon,authenticated,service_role,boletin_credits_api;
grant execute on function public.authorize_document_mail(uuid,uuid) to boletin_worker;

insert into private.schema_migrations(version) values('005-retention');
notify pgrst,'reload schema';
commit;
