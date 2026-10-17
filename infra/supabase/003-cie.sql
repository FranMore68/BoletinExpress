begin;
-- Extiende la cola compartida; los trabajos anteriores siguen siendo BRIE.
alter table private.pdf_jobs add column document_type text not null default 'BRIE' check(document_type in ('BRIE','CIE'));
create function private.valid_cie_fields(p_data jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare rules jsonb; k text; v jsonb; r jsonb; c jsonb; parent text;
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>16384 then return false; end if;
 rules:='{"NomCognoms":{"type":"string","max":180},"NIF":{"type":"string","max":180},"CBO_TipusVia":{"type":"string","max":180,"choices":["0","APA","AVI","BAI","BRC","BAR","BLO","CAM","CAR","CRO","CRT","CAS","COL","COS","DIS","EDI","FAG","GLO","GRV","GRU","LLO","MER","PAR","PTD","PTG","PAS","PLA","PCT","POB","POL","PRO","PUJ","RAM","RON","SEN","TOR","TRA","TVS","URB","VIA","XAL"]},"TXT_NomVia":{"type":"string","max":180},"TXT_Num":{"type":"string","max":180},"TXT_Bloc":{"type":"string","max":180},"TXT_Escala":{"type":"string","max":180},"TXT_Pis":{"type":"string","max":180},"TXT_Porta":{"type":"string","max":180},"TXT_CodiPostal":{"type":"string","max":5,"postal":true},"TXT_Poblacio":{"type":"string","max":180},"TXT_Tel":{"type":"string","max":180},"TXT_Correu":{"type":"string","max":180},"NomCognoms_2":{"type":"string","max":180},"TXT_Rasic":{"type":"string","max":180},"NIF_2":{"type":"string","max":180},"NomCognomsInstalador":{"type":"string","max":180},"TXT_Categoria":{"type":"string","max":180,"choices":["Bàsica","Especialista"]},"DNIInstallador":{"type":"string","max":180},"CBO_TipusVia_2":{"type":"string","max":180,"choices":["0","APA","AVI","BAI","BRC","BAR","BLO","CAM","CAR","CRO","CRT","CAS","COL","COS","DIS","EDI","FAG","GLO","GRV","GRU","LLO","MER","PAR","PTD","PTG","PAS","PLA","PCT","POB","POL","PRO","PUJ","RAM","RON","SEN","TOR","TRA","TVS","URB","VIA","XAL"]},"TXT_NomVia_2":{"type":"string","max":180},"TXT_Num_2":{"type":"string","max":180},"TXT_Bloc_2":{"type":"string","max":180},"TXT_Escala_2":{"type":"string","max":180},"TXT_Pis_2":{"type":"string","max":180},"TXT_Porta_2":{"type":"string","max":180},"TXT_CodiPostal_2":{"type":"string","max":5,"postal":true},"TXT_Poblacio_2":{"type":"string","max":180},"TXT_Tel_2":{"type":"string","max":180},"TXT_Correu_2":{"type":"string","max":180},"CBO_TipusVia_3":{"type":"string","max":180,"choices":["0","APA","AVI","BAI","BRC","BAR","BLO","CAM","CAR","CRO","CRT","CAS","COL","COS","DIS","EDI","FAG","GLO","GRV","GRU","LLO","MER","PAR","PTD","PTG","PAS","PLA","PCT","POB","POL","PRO","PUJ","RAM","RON","SEN","TOR","TRA","TVS","URB","VIA","XAL"]},"TXT_NomVia_3":{"type":"string","max":180},"TXT_Num_3":{"type":"string","max":180},"TXT_Bloc_3":{"type":"string","max":180},"TXT_Escala_3":{"type":"string","max":180},"TXT_Pis_3":{"type":"string","max":180},"TXT_Porta_3":{"type":"string","max":180},"TXT_CodiPostal_3":{"type":"string","max":5,"postal":true},"TXT_Poblacio_3":{"type":"string","max":180},"TXT_Tel_3":{"type":"string","max":180},"TXT_Correu_3":{"type":"string","max":180},"RB_TipusActuacio":{"type":"string","max":180,"choices":["NOVA","AMPLIACIO","MODIFICACIO"]},"TXT_CUPS":{"type":"string","max":180,"condition":{"key":"RB_TipusActuacio","not":["NOVA"]}},"RB_Requisits":{"type":"string","max":180,"choices":["P1","P2","MEMORIA"]},"TXT_Us":{"type":"string","max":180,"choices":["1","2","3","4","5","8","9","10","11","12","13","14","g","h"]},"TXT_PotenciaMax":{"type":"string","max":180},"TXT_Calibre":{"type":"string","max":180},"TXT_Tensio":{"type":"string","max":180,"choices":["230 V","3x230/400 V","Altra"]},"TXT_IGM":{"type":"string","max":180},"TXT_Circuits":{"type":"string","max":180},"TXT_SeccioLGA":{"type":"string","max":180},"TXT_MaterialConductor":{"type":"string","max":180,"choices":["Coure","Alumini"]},"TXT_ResistenciaConductors":{"type":"string","max":180},"TXT_UbicacioComptadors":{"type":"string","max":180,"choices":["Sala","Armari","Altra"]},"TXT_AillamentTerra":{"type":"string","max":180},"TXT_ResistenciaTerra":{"type":"string","max":180},"TXT_Interruptor":{"type":"string","max":180},"TXT_TipusConnexio":{"type":"string","max":180,"choices":["Assistida","Interconnectada"]},"RB_Subministrament":{"type":"string","max":180,"choices":["SI","NO"]},"TXT_Potencia":{"type":"string","max":180},"NomCognomsInstalador_2":{"type":"string","max":180},"TXT_Observacions":{"type":"string","max":1200},"DDLAmpliaMod":{"type":"string","max":180,"choices":["SI","NO"],"condition":{"key":"RB_TipusActuacio","values":["AMPLIACIO","MODIFICACIO"]}},"TXT_P1":{"type":"string","max":180,"choices":["a) Instal·lacions industrials amb una potència màxima admissible superior a 100 kW","b) Locals de pública concurrència","c) Locals amb risc d''incendi o explosió, de classe I, excepte aparcaments i estacionaments de menys de 25 places.","d) Locals mullats P > 25 kW","e) Piscines P > 10 kW","f) Sales d''operacions quirúrgiques i sales d''intervenció","g) Instal·lacions d''enllumenat exterior P>5kW","h) Instal·lacions comunes d’edificis destinats a habitatges de 20 subministraments o més i/o més de 100 kW per CGP","i1) Instal·lacions corresponents a les infraestructures per a la recàrrega del vehicle elèctric (P>50 kW)","i2) Instal·lacions de recàrrega de vehicle elèctric ubicades a l''exterior (P>10kW)","i3) Instal·lacions que incloguin estacions de recàrrega previstes pel mode de càrrega 4"],"condition":{"key":"RB_Requisits","values":["P1"]}},"TXT_P2":{"type":"string","max":180,"choices":["a) Instal·lacions corresponents a indústries, en general 20 kW>P<=100 kW","b1) Locals humits, amb pols o amb risc de corrosió (P>10 kW)","b2) Bombes d’extracció o elevació d’aigua, siguin industrials o no (P > 10 kW)","c1) Locals mullats (P > 10 kW)","c2) Generadors i convertidors (P > 10 kW)","c3) Conductors aïllats per caldejament, exclosos els habitatges (P > 10 kW i P<25 kW)","d1) Instal·lacions de caràcter temporal per a alimentació de maquinària d''obres de construcció (P > 50 kW)","d2) Instal·lacions de caràcter temporal en locals o emplaçaments oberts (P > 50 kW)","e) Edificis destinats a oficines, i locals comercials que no tinguin la consideració de pública concurrència amb més de 100 kW de potència per CGP","f ) Les corresponents a habitatges unifamiliars P > 50 kW","g) Aparcaments o estacionaments que requereixen ventilació forçada (Menys de 25 places)","h) Aparcaments o estacionaments amb ventilació natural (Més de 5 places i menys de 25 places)","j1) Línies de baixa tensió amb suports comuns amb les d''alta tensió","j2) Màquines d''elevació i transport","j3) Instal·lacions que utilitzin tensions especials","j4) Instal·lacions destinades a rètols lluminosos, llevat que es considerin instal·lacions de baixa tensió, segons el que estableix la ITC-BT 44","j5) Tanques elèctriques","n) Instal·lacions corresponents a piscines i fonts P > 5 kW, piscines fins a 10 kW","o) locals sense risc específic amb una potència màxima admissible >100 kW"],"condition":{"key":"RB_Requisits","values":["P2"]}},"TXT_G":{"type":"string","max":180,"choices":["g1) Cine","g2) Teatre","g3) Auditori","g4) Estadi","g5) Pavelló esportiu","g6) Plaça de toros","g7) Hipòdrom","g8) Parc d''atraccions o fira fixa","g9) Sala de festes o discoteca","g10) Sala de jocs d''atzar"],"condition":{"key":"TXT_Us","values":["g"]}},"TXT_H":{"type":"string","max":180,"choices":["h1) Temple","h2) Museu","h3) Sales de conferències i congressos","h4) Casino","h5) Hotel, hostal","h6) Bar, cafeteria, restaurant o similar","h7) Zones comunes en agrupacions d''establiments comercials","h8) Aeroport, estació de viatgers","h9) Estacionaments públics tancats i coberts per a més de 5 vehicles","h10) Hospital, ambulatori o sanatori","h11) Asils i llars d''infants","h12) Biblioteca","h13) Centre d''ensenyament","h14) Consultori mèdics","h15) Establiment comercial","h16) Oficina amb presència de públic","h17) Residència d''estudiants","h18) Gimnàs","h19) Sala d''exposicions","h20) Centre cultural","h21) Club social o esportiu","h22) Altres locals de pública concurrència"],"condition":{"key":"TXT_Us","values":["h"]}},"AltresUsos":{"type":"string","max":180,"condition":{"key":"TXT_Us","values":["14"]}},"InfoTensioAltre":{"type":"string","max":180,"condition":{"key":"TXT_Tensio","values":["Altra"]}},"TXT_Tecnologia":{"type":"string","max":180}}'::jsonb;
 for k,v in select * from jsonb_each(p_data) loop
  r:=rules->k;
  if r is null or jsonb_typeof(v)<>'string' then return false; end if;
  if char_length(v#>>'{}')>(r->>'max')::int then return false; end if;
  if v='""'::jsonb then continue; end if;
  if r?'choices' and not (r->'choices' @> jsonb_build_array(v)) then return false; end if;
  if r?'postal' and (v#>>'{}') !~ '^[0-9]{5}$' then return false; end if;
  c:=r->'condition';
  if c is not null then
   parent:=coalesce(p_data->>(c->>'key'),'');
   if c?'values' and not (c->'values' @> jsonb_build_array(parent)) then return false; end if;
   if c?'not' and c->'not' @> jsonb_build_array(parent) then return false; end if;
  end if;
 end loop;
 return true;
end;$$;
revoke all on function private.valid_cie_fields(jsonb) from public,anon,authenticated,service_role;
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
 elsif p_type='CIE' then
  select fields into profile from public.professional_profiles where owner_id=auth.uid();
  if profile?'empresa_nom' then initial:=initial||jsonb_build_object('NomCognoms_2',profile->'empresa_nom'); end if;
  if profile?'empresa_nif' then initial:=initial||jsonb_build_object('NIF_2',profile->'empresa_nif'); end if;
  if profile?'empresa_rasic' then initial:=initial||jsonb_build_object('TXT_Rasic',profile->'empresa_rasic'); end if;
  if profile?'empresa_telefon' then initial:=initial||jsonb_build_object('TXT_Tel_2',profile->'empresa_telefon'); end if;
  if profile?'empresa_correu' then initial:=initial||jsonb_build_object('TXT_Correu_2',profile->'empresa_correu'); end if;
  if profile?'installador_nom' then initial:=initial||jsonb_build_object('NomCognomsInstalador',profile->'installador_nom'); end if;
  if profile?'installador_dni' then initial:=initial||jsonb_build_object('DNIInstallador',profile->'installador_dni'); end if;
  if profile?'installador_categoria' then initial:=initial||jsonb_build_object('TXT_Categoria',profile->'installador_categoria'); end if;
  if profile?'empresa_via_tipo' then initial:=initial||jsonb_build_object('CBO_TipusVia_2',profile->'empresa_via_tipo'); end if;
  if profile?'empresa_via_nom' then initial:=initial||jsonb_build_object('TXT_NomVia_2',profile->'empresa_via_nom'); end if;
  if profile?'empresa_numero' then initial:=initial||jsonb_build_object('TXT_Num_2',profile->'empresa_numero'); end if;
  if profile?'empresa_bloc' then initial:=initial||jsonb_build_object('TXT_Bloc_2',profile->'empresa_bloc'); end if;
  if profile?'empresa_escala' then initial:=initial||jsonb_build_object('TXT_Escala_2',profile->'empresa_escala'); end if;
  if profile?'empresa_pis' then initial:=initial||jsonb_build_object('TXT_Pis_2',profile->'empresa_pis'); end if;
  if profile?'empresa_porta' then initial:=initial||jsonb_build_object('TXT_Porta_2',profile->'empresa_porta'); end if;
  if profile?'empresa_cp' then initial:=initial||jsonb_build_object('TXT_CodiPostal_2',profile->'empresa_cp'); end if;
  if profile?'empresa_municipi' then initial:=initial||jsonb_build_object('TXT_Poblacio_2',profile->'empresa_municipi'); end if;
  if profile?'installador_nom' then initial:=initial||jsonb_build_object('NomCognomsInstalador_2',profile->'installador_nom'); end if;
 end if;
 insert into public.documents(type,title,owner_id,work_data,data_started_at)
 values(p_type,p_title,auth.uid(),initial,case when initial<>'{}' then now() end) returning * into result;
 return result;
end;$$;

create function public.save_cie(p_document uuid,p_fields jsonb,p_revision integer) returns public.documents
language plpgsql security definer set search_path='' as $$
declare result public.documents;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into result from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found then raise exception 'not_found' using errcode='42501'; end if;
 if result.status<>'draft' then raise exception 'closed' using errcode='23514'; end if;
 if result.type<>'CIE' or not private.valid_cie_fields(p_fields) then raise exception 'input' using errcode='22023'; end if;
 if result.revision is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 update public.documents set work_data=p_fields,revision=revision+1,
 data_started_at=coalesce(data_started_at,case when exists(select 1 from jsonb_each(p_fields) x where x.value<>'""'::jsonb) then now() end)
 where id=p_document returning * into result;
 return result;
end;$$;
revoke all on function public.save_cie(uuid,jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_cie(uuid,jsonb,integer) to authenticated;

create function public.request_cie_preview(p_document uuid,p_revision integer,p_retry boolean default false) returns public.document_previews
language plpgsql security definer set search_path='' as $$
declare doc public.documents; result public.document_previews; job_id uuid:=gen_random_uuid(); path text;
begin
 if not private.session_active() then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into doc from public.documents where id=p_document and owner_id=auth.uid() for update;
 if not found then raise exception 'not_found' using errcode='42501'; end if;
 if doc.status<>'draft' then raise exception 'closed' using errcode='23514'; end if;
 if doc.type<>'CIE' then raise exception 'input' using errcode='22023'; end if;
 if doc.revision is distinct from p_revision then raise exception 'conflict' using errcode='PT409'; end if;
 if not private.valid_cie_fields(doc.work_data) then raise exception 'input' using errcode='22023'; end if;
 select * into result from public.document_previews where document_id=p_document and revision=p_revision;
 if found then
  if p_retry and result.status='failed' and result.error_fields='[]'::jsonb then
   update private.pdf_jobs set state='pending',attempts=0 where id=result.id;
   update public.document_previews set status='pending' where id=result.id returning * into result;
  end if;
  return result;
 end if;
 path:=auth.uid()::text||'/'||doc.id::text||'/'||job_id::text||'.pdf';
 insert into private.pdf_jobs(id,document_id,owner_id,revision,payload,object_path,document_type) values(job_id,doc.id,auth.uid(),p_revision,doc.work_data,path,'CIE');
 insert into public.document_previews(id,document_id,owner_id,revision,object_path) values(job_id,doc.id,auth.uid(),p_revision,path) returning * into result;
 return result;
end;$$;
revoke all on function public.request_cie_preview(uuid,integer,boolean) from public,anon,authenticated,service_role;
grant execute on function public.request_cie_preview(uuid,integer,boolean) to authenticated;

insert into private.schema_migrations(version) values('003-cie');
notify pgrst,'reload schema';
commit;
