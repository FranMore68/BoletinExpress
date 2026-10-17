begin;
create table public.professional_profiles (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 fields jsonb not null default '{}', revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.professional_profiles enable row level security;
revoke all on public.professional_profiles from anon,authenticated;
grant select on public.professional_profiles to authenticated;
create policy profile_owner on public.professional_profiles for select to authenticated using(owner_id=auth.uid() and private.session_active());
alter table public.documents add column revision integer not null default 0;
alter table public.documents add column data_started_at timestamptz;

create function private.valid_document_fields(p_data jsonb,p_kind text) returns boolean
language plpgsql immutable set search_path='' as $$
declare rules jsonb; k text; v jsonb; r jsonb;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16384 then return false; end if;
 rules:=case p_kind when 'profile' then '{"empresa_nom":{"type":"string","max":180},"empresa_nif":{"type":"string","max":30},"empresa_telefon":{"type":"string","max":30},"empresa_rasic":{"type":"string","max":60},"installador_nom":{"type":"string","max":180},"installador_nif":{"type":"string","max":30},"installador_dni":{"type":"string","max":30},"installador_categoria":{"type":"string","max":60},"empresa_via_tipo":{"type":"string","max":120},"empresa_via_nom":{"type":"string","max":120},"empresa_numero":{"type":"string","max":120},"empresa_bloc":{"type":"string","max":120},"empresa_escala":{"type":"string","max":120},"empresa_pis":{"type":"string","max":120},"empresa_porta":{"type":"string","max":120},"empresa_cp":{"type":"string","max":120},"empresa_municipi":{"type":"string","max":120},"empresa_correu":{"type":"string","max":120}}'::jsonb when 'BRIE' then '{"exemplar":{"type":"string","max":180,"choices":["titular","distribuidora","installadora"]},"empresa_nom":{"type":"string","max":180},"empresa_telefon":{"type":"string","max":30},"empresa_rasic":{"type":"string","max":60},"installador_nom":{"type":"string","max":180},"installador_nif":{"type":"string","max":30},"installador_dni":{"type":"string","max":30},"activitat_anterior":{"type":"string","max":180},"activitat_actual":{"type":"string","max":180},"superficie":{"type":"string","max":180},"local_carrer":{"type":"string","max":180},"local_numero":{"type":"string","max":180},"local_pis":{"type":"string","max":180},"local_porta":{"type":"string","max":180},"local_municipi":{"type":"string","max":180},"local_cp":{"type":"string","max":180},"titular_nom":{"type":"string","max":180},"titular_nif":{"type":"string","max":180},"titular_domicili":{"type":"string","max":180},"titular_municipi":{"type":"string","max":180},"titular_telefon":{"type":"string","max":180},"titular_cp":{"type":"string","max":180},"treball":{"type":"string","max":600},"diferencial_1_nombre":{"type":"string","max":180},"diferencial_1_in":{"type":"string","max":180},"diferencial_1_sensibilitat":{"type":"string","max":180},"diferencial_2_nombre":{"type":"string","max":180},"diferencial_2_in":{"type":"string","max":180},"diferencial_2_sensibilitat":{"type":"string","max":180},"seccio_derivacio":{"type":"string","max":180},"resistencia_terra":{"type":"string","max":180},"resistencia_aillament":{"type":"string","max":180},"potencia_maxima":{"type":"string","max":180},"potencia_inicial":{"type":"string","max":180},"potencia_contractar":{"type":"string","max":180},"tensio_anterior":{"type":"string","max":180},"tensio_actual":{"type":"string","max":180},"intensitat_iga":{"type":"string","max":180},"intensitat_icpm":{"type":"string","max":180},"terra_existeix":{"type":"boolean","max":180},"ascensor":{"type":"boolean","max":180},"potencia_ascensor":{"type":"string","max":180},"certificat_nom":{"type":"string","max":180},"certificat_dni":{"type":"string","max":180},"certificat_rasic":{"type":"string","max":180},"lloc_data":{"type":"string","max":180},"defecte_1":{"type":"boolean","max":180},"defecte_2":{"type":"boolean","max":180},"defecte_3":{"type":"boolean","max":180},"defecte_4":{"type":"boolean","max":180},"defecte_5":{"type":"boolean","max":180},"defecte_6":{"type":"boolean","max":180},"defecte_7":{"type":"boolean","max":180},"defecte_8":{"type":"boolean","max":180},"defecte_9":{"type":"boolean","max":180},"defecte_10":{"type":"boolean","max":180},"defecte_3_tensio":{"type":"string","max":180},"defecte_10_descripcio":{"type":"string","max":600},"comentaris":{"type":"string","max":600}}'::jsonb else '{}'::jsonb end;
 for k,v in select * from jsonb_each(p_data) loop
  r:=rules->k;
  if r is null or jsonb_typeof(v)<>r->>'type' then return false; end if;
  if jsonb_typeof(v)='string' and (char_length(v#>>'{}')>(r->>'max')::int or (r?'choices' and v<>'""'::jsonb and not (r->'choices' @> jsonb_build_array(v)))) then return false; end if;
 end loop;
 return true;
end;$$;
revoke all on function private.valid_document_fields(jsonb,text) from public,anon,authenticated,service_role;

create function public.save_professional_profile(p_fields jsonb,p_revision integer) returns public.professional_profiles
language plpgsql security definer set search_path='' as $$
declare result public.professional_profiles;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 if not private.valid_document_fields(p_fields,'profile') then raise exception 'input' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into result from public.professional_profiles where owner_id=auth.uid() for update;
 if coalesce(result.revision,0) is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 insert into public.professional_profiles(owner_id,fields) values(auth.uid(),p_fields)
 on conflict(owner_id) do update set fields=excluded.fields,revision=public.professional_profiles.revision+1,updated_at=now() returning * into result;
 return result;
end;$$;
revoke all on function public.save_professional_profile(jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_professional_profile(jsonb,integer) to authenticated;

create or replace function public.create_document(p_type text,p_title text) returns public.documents
language plpgsql security definer set search_path='' as $$
declare result public.documents; profile jsonb; initial jsonb:='{}'; k text;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.documents where owner_id=auth.uid() and status='draft')>=3 then raise exception 'draft_limit' using errcode='23514'; end if;
 if p_type='BRIE' then
  select fields into profile from public.professional_profiles where owner_id=auth.uid();
  foreach k in array array['empresa_nom','empresa_telefon','empresa_rasic','installador_nom','installador_nif','installador_dni'] loop
   if profile?k then initial:=initial||jsonb_build_object(k,profile->k); end if;
  end loop;
  if profile?'installador_nom' then initial:=initial||jsonb_build_object('certificat_nom',profile->'installador_nom'); end if;
  if profile?'installador_dni' then initial:=initial||jsonb_build_object('certificat_dni',profile->'installador_dni'); end if;
  if profile?'empresa_rasic' then initial:=initial||jsonb_build_object('certificat_rasic',profile->'empresa_rasic'); end if;
 end if;
 insert into public.documents(type,title,owner_id,work_data,data_started_at)
 values(p_type,p_title,auth.uid(),initial,case when initial<>'{}' then now() end) returning * into result;
 return result;
end;$$;

create function public.save_brie(p_document uuid,p_fields jsonb,p_revision integer) returns public.documents
language plpgsql security definer set search_path='' as $$
declare result public.documents;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into result from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found then raise exception 'not_found' using errcode='42501'; end if;
 if result.status<>'draft' then raise exception 'closed' using errcode='23514'; end if;
 if result.type<>'BRIE' or not private.valid_document_fields(p_fields,'BRIE') then raise exception 'input' using errcode='22023'; end if;
 if result.revision is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 update public.documents set work_data=p_fields,revision=revision+1,
 data_started_at=coalesce(data_started_at,case when exists(select 1 from jsonb_each(p_fields) x where x.value<>'""'::jsonb) then now() end)
 where id=p_document returning * into result;
 return result;
end;$$;
revoke all on function public.save_brie(uuid,jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_brie(uuid,jsonb,integer) to authenticated;

DO $$begin if not exists(select from pg_roles where rolname='boletin_worker') then create role boletin_worker nologin noinherit; end if; end$$;
grant boletin_worker to authenticator,supabase_storage_admin;
grant usage on schema public,private,storage to boletin_worker;
grant select,insert,delete on storage.objects to boletin_worker;
grant select on storage.buckets to boletin_worker;

create table private.pdf_jobs (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,revision integer not null,payload jsonb not null,
 object_path text not null unique,state text not null default 'pending' check(state in ('pending','processing','ready','failed','stale')),
 attempts int not null default 0,claim uuid,lease_until timestamptz,created_at timestamptz not null default now(),
 unique(document_id,revision)
);
revoke all on private.pdf_jobs from public,anon,authenticated,boletin_worker,service_role;
create table public.document_previews (
 id uuid primary key references private.pdf_jobs(id) on delete cascade,document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,revision integer not null,
 object_path text not null,status text not null default 'pending',error_fields jsonb not null default '[]',sha256 text,
 unique(document_id,revision)
);
alter table public.document_previews enable row level security;
revoke all on public.document_previews from anon,authenticated;
grant select on public.document_previews to authenticated;
create policy preview_owner on public.document_previews for select to authenticated using(owner_id=auth.uid() and private.session_active());

create function public.request_brie_preview(p_document uuid,p_revision integer,p_retry boolean default false) returns public.document_previews
language plpgsql security definer set search_path='' as $$
declare doc public.documents; result public.document_previews; job_id uuid:=gen_random_uuid(); path text;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into doc from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found then raise exception 'not_found' using errcode='42501'; end if;
 if doc.status<>'draft' then raise exception 'closed' using errcode='23514'; end if;
 if doc.type<>'BRIE' then raise exception 'input' using errcode='22023'; end if;
 if doc.revision is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 select * into result from public.document_previews where document_id=p_document and revision=p_revision;
 if found then
  if p_retry and result.status='failed' and result.error_fields='[]'::jsonb then
   update private.pdf_jobs set state='pending',attempts=0 where id=result.id;
   update public.document_previews set status='pending' where id=result.id returning * into result;
  end if;
  return result;
 end if;
 path:=auth.uid()::text||'/'||doc.id::text||'/'||job_id::text||'.pdf';
 insert into private.pdf_jobs(id,document_id,owner_id,revision,payload,object_path) values(job_id,doc.id,auth.uid(),p_revision,doc.work_data,path);
 insert into public.document_previews(id,document_id,owner_id,revision,object_path) values(job_id,doc.id,auth.uid(),p_revision,path) returning * into result;
 return result;
end;$$;
revoke all on function public.request_brie_preview(uuid,integer,boolean) from public,anon,authenticated,service_role;
grant execute on function public.request_brie_preview(uuid,integer,boolean) to authenticated;

create function public.claim_brie_job() returns setof private.pdf_jobs
language plpgsql security definer set search_path='' as $$
declare job private.pdf_jobs;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 if not pg_try_advisory_xact_lock(184624010) then return; end if;
 update private.pdf_jobs set state=case when attempts>=3 then 'failed' else 'pending' end,claim=null
 where state='processing' and lease_until<now();
 update public.document_previews p set status=j.state from private.pdf_jobs j where j.id=p.id and p.status='processing' and j.state<>'processing';
 if exists(select 1 from private.pdf_jobs where state='processing' and lease_until>now()) then return; end if;
 select j.* into job from private.pdf_jobs j join public.documents d on d.id=j.document_id
 where j.state='pending' and j.revision=d.revision and d.status='draft' order by j.created_at for update of j skip locked limit 1;
 if not found then return; end if;
 update private.pdf_jobs set state='processing',attempts=attempts+1,claim=gen_random_uuid(),lease_until=now()+interval '120 seconds' where id=job.id returning * into job;
 update public.document_previews set status='processing' where id=job.id;
 return next job;
end;$$;
revoke all on function public.claim_brie_job() from public,anon,authenticated,service_role;
grant execute on function public.claim_brie_job() to boletin_worker;

create function public.finish_brie_job(p_job uuid,p_claim uuid,p_sha text,p_errors jsonb default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare job private.pdf_jobs; doc public.documents; new_state text;
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 select * into job from private.pdf_jobs where id=p_job;
 if not found then return false; end if;
 select * into doc from public.documents where id=job.document_id for update;
 select * into job from private.pdf_jobs where id=p_job for update;
 if job.state<>'processing' or job.claim is distinct from p_claim or job.lease_until<now() then return false; end if;
 if doc.revision<>job.revision or doc.status<>'draft' then new_state:='stale';
 elsif p_errors is not null then new_state:=case when p_errors<>'[]'::jsonb or job.attempts>=3 then 'failed' else 'pending' end;
 elsif p_sha is null or p_sha !~ '^[a-f0-9]{64}$' or not exists(select 1 from storage.objects where bucket_id='previews' and name=job.object_path) then return false;
 else new_state:='ready'; end if;
 update private.pdf_jobs set state=new_state,claim=null,lease_until=null where id=p_job;
 update public.document_previews set status=new_state,sha256=case when new_state='ready' then p_sha end,error_fields=coalesce(p_errors,'[]'::jsonb) where id=p_job;
 return true;
end;$$;
revoke all on function public.finish_brie_job(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.finish_brie_job(uuid,uuid,text,jsonb) to boletin_worker;

create function private.preview_storage_access(p_path text,p_write boolean) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.pdf_jobs j join public.documents d on d.id=j.document_id
 where j.object_path=p_path and d.status='draft' and d.revision=j.revision and
 case when p_write then auth.role()='boletin_worker' and j.state='processing' and j.lease_until>now()
 else j.state='ready' and j.owner_id=auth.uid() and private.session_active() end);
$$;
revoke all on function private.preview_storage_access(text,boolean) from public,anon,authenticated,service_role;
grant execute on function private.preview_storage_access(text,boolean) to authenticated,boletin_worker;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('previews','previews',false,2097152,array['application/pdf']);
create policy preview_worker_insert on storage.objects for insert to boletin_worker with check(bucket_id='previews' and private.preview_storage_access(name,true));
create policy preview_worker_read on storage.objects for select to boletin_worker using(bucket_id='previews' and private.preview_storage_access(name,true));
create policy preview_user_read on storage.objects for select to authenticated using(bucket_id='previews' and private.preview_storage_access(name,false));
-- La limpieza de versiones obsoletas se ejecuta por el worker, no por clientes.
create function public.obsolete_brie_previews() returns table(id uuid,object_path text)
language sql stable security definer set search_path='' as $$
 select j.id,j.object_path from private.pdf_jobs j join public.documents d on d.id=j.document_id
 where auth.role()='boletin_worker' and j.revision<>d.revision and (j.state<>'processing' or j.lease_until<now()) limit 10;
$$;
revoke all on function public.obsolete_brie_previews() from public,anon,authenticated,service_role;
grant execute on function public.obsolete_brie_previews() to boletin_worker;
create function private.obsolete_preview(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.pdf_jobs j join public.documents d on d.id=j.document_id where j.object_path=p_path and j.revision<>d.revision and (j.state<>'processing' or j.lease_until<now()));
$$;
revoke all on function private.obsolete_preview(text) from public,anon,authenticated,service_role;
grant execute on function private.obsolete_preview(text) to boletin_worker;
create policy preview_worker_delete on storage.objects for delete to boletin_worker using(bucket_id='previews' and private.obsolete_preview(name));
create function public.remove_obsolete_preview(p_job uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'boletin_worker' then raise exception 'not_authorized' using errcode='42501'; end if;
 delete from private.pdf_jobs j where id=p_job and private.obsolete_preview(j.object_path)
 and not exists(select 1 from storage.objects o where o.bucket_id='previews' and o.name=j.object_path);
 return found;
end;$$;
revoke all on function public.remove_obsolete_preview(uuid) from public,anon,authenticated,service_role;
grant execute on function public.remove_obsolete_preview(uuid) to boletin_worker;
insert into private.schema_migrations(version) values('002-brie');
notify pgrst,'reload schema';
commit;
