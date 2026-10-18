begin;
alter table public.credit_movements drop constraint credit_movements_kind_check;
alter table public.credit_movements add constraint credit_movements_kind_check check(kind in ('welcome','validation','renewal','topup'));

create table public.credit_purchases (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, pack text not null check(pack in ('basic','pro')),
 locale text not null check(locale in ('es','ca')),
 amount_cents integer not null,credits integer not null,
 status text not null default 'creating' check(status in ('creating','pending','paid','expired','failed')),
 stripe_session text unique check(stripe_session ~ '^cs_test_[A-Za-z0-9]+$'),
 stripe_payment text unique check(stripe_payment ~ '^pi_[A-Za-z0-9]+$'),
 created_at timestamptz not null default now(), paid_at timestamptz,
 unique(owner_id,request_id),
 check((pack='basic' and amount_cents=1000 and credits=10) or (pack='pro' and amount_cents=2000 and credits=25))
);
create index purchases_owner on public.credit_purchases(owner_id,created_at desc);
alter table public.credit_purchases enable row level security;
revoke all on public.credit_purchases from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
grant select(id,owner_id,pack,amount_cents,credits,status,created_at,paid_at) on public.credit_purchases to authenticated;
create policy purchases_owner on public.credit_purchases for select to authenticated using(owner_id=auth.uid() and private.session_active());
create table private.payment_events (
 event_id text primary key check(event_id ~ '^evt_[A-Za-z0-9]+$'),
 order_id uuid not null references public.credit_purchases(id) on delete cascade,
 event_type text not null,created_at timestamptz not null default now()
);
revoke all on private.payment_events from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
do $$begin if not exists(select from pg_roles where rolname='boletin_payments_api') then create role boletin_payments_api nologin noinherit; end if; end$$;
grant boletin_payments_api to authenticator;
grant usage on schema public to boletin_payments_api;

create function public.begin_checkout(p_owner uuid,p_session uuid,p_request uuid,p_pack text,p_locale text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare purchase public.credit_purchases;
begin
 if auth.role() is distinct from 'boletin_payments_api' then raise exception 'not_authorized' using errcode='42501'; end if;
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_owner and u.email_confirmed_at is not null and (s.not_after is null or s.not_after>now())) then raise exception 'session' using errcode='PT401'; end if;
 if p_pack is null or p_pack not in ('basic','pro') or p_locale is null or p_locale not in ('es','ca') or p_request is null then raise exception 'payment_mismatch' using errcode='PT400'; end if;
 -- Fixed lock order shared with validation and renewal: wallet, then purchase.
 perform 1 from public.credit_accounts where owner_id=p_owner for update;
 if not found then raise exception 'session' using errcode='PT401'; end if;
 select * into purchase from public.credit_purchases where owner_id=p_owner and request_id=p_request;
 if found then
  if purchase.pack<>p_pack then raise exception 'conflict' using errcode='PT409'; end if;
  -- Never reuse a Stripe creation key after its provider retention window.
  if purchase.stripe_session is null and purchase.created_at<now()-interval '20 minutes' then raise exception 'conflict' using errcode='PT409'; end if;
  return to_jsonb(purchase);
 end if;
 if (select count(*) from public.credit_purchases where owner_id=p_owner and created_at>now()-interval '1 day')>=20 then raise exception 'rate' using errcode='PT429'; end if;
 insert into public.credit_purchases(owner_id,request_id,pack,locale,amount_cents,credits)
 values(p_owner,p_request,p_pack,p_locale,case p_pack when 'basic' then 1000 else 2000 end,case p_pack when 'basic' then 10 else 25 end) returning * into purchase;
 return to_jsonb(purchase);
end;$$;

create function public.bind_checkout(p_order uuid,p_checkout text) returns boolean
language plpgsql security definer set search_path='' as $$
declare purchase public.credit_purchases;
begin
 if auth.role() is distinct from 'boletin_payments_api' then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_checkout is null or p_checkout !~ '^cs_test_[A-Za-z0-9]+$' then raise exception 'payment_mismatch' using errcode='PT400'; end if;
 select * into purchase from public.credit_purchases where id=p_order for update;
 if not found then raise exception 'not_found' using errcode='PT404'; end if;
 if purchase.stripe_session is not null and purchase.stripe_session<>p_checkout then raise exception 'conflict' using errcode='PT409'; end if;
 update public.credit_purchases set stripe_session=p_checkout,status=case when status='creating' then 'pending' else status end where id=p_order;
 return true;
end;$$;

create function public.apply_payment_event(p_event text,p_event_type text,p_order uuid,p_owner uuid,p_pack text,p_checkout text,p_payment text,p_amount integer,p_currency text,p_paid boolean,p_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare purchase public.credit_purchases; account public.credit_accounts; previous private.payment_events;
begin
 if auth.role() is distinct from 'boletin_payments_api' then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_event is null or p_event !~ '^evt_[A-Za-z0-9]+$' or p_checkout is null or p_checkout !~ '^cs_test_[A-Za-z0-9]+$'
 or p_event_type is null or p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired')
 or p_paid is null or p_status is null or p_status not in ('open','complete','expired') then raise exception 'payment_mismatch' using errcode='PT400'; end if;
 select * into account from public.credit_accounts where owner_id=p_owner for update;
 if not found then raise exception 'not_found' using errcode='PT404'; end if;
 select * into purchase from public.credit_purchases where id=p_order for update;
 if not found then raise exception 'not_found' using errcode='PT404'; end if;
 if purchase.owner_id is distinct from p_owner or purchase.pack is distinct from p_pack or purchase.amount_cents is distinct from p_amount or p_currency is distinct from 'eur'
 or (purchase.stripe_session is not null and purchase.stripe_session<>p_checkout)
 or (purchase.stripe_payment is not null and purchase.stripe_payment is distinct from p_payment)
 then raise exception 'payment_mismatch' using errcode='PT400'; end if;
 select * into previous from private.payment_events where event_id=p_event;
 if found then
  if previous.order_id<>p_order or previous.event_type<>p_event_type then raise exception 'payment_mismatch' using errcode='PT400'; end if;
  return jsonb_build_object('duplicate',true,'status',purchase.status);
 end if;
 insert into private.payment_events(event_id,order_id,event_type) values(p_event,p_order,p_event_type);
 if p_paid then
  if p_status<>'complete' or p_payment is null or p_payment !~ '^pi_[A-Za-z0-9]+$' then raise exception 'payment_mismatch' using errcode='PT400'; end if;
  if purchase.status<>'paid' then
   update public.credit_accounts set balance=balance+purchase.credits,updated_at=now() where owner_id=p_owner returning * into account;
   insert into public.credit_movements(owner_id,amount,balance_after,kind,operation_key)
   values(p_owner,purchase.credits,account.balance,'topup','stripe:'||p_checkout);
   update public.credit_purchases set status='paid',paid_at=now(),stripe_session=p_checkout,stripe_payment=p_payment where id=p_order;
  end if;
 elsif purchase.status<>'paid' then
  update public.credit_purchases set stripe_session=p_checkout,status=case when p_status='expired' then 'expired' when p_event_type='checkout.session.async_payment_failed' then 'failed' else 'pending' end where id=p_order;
 end if;
 return jsonb_build_object('duplicate',false,'status',case when p_paid then 'paid' else purchase.status end);
end;$$;
revoke all on function public.begin_checkout(uuid,uuid,uuid,text,text),public.bind_checkout(uuid,text),public.apply_payment_event(text,text,uuid,uuid,text,text,text,integer,text,boolean,text) from public,anon,authenticated,service_role,boletin_worker,boletin_credits_api;
grant execute on function public.begin_checkout(uuid,uuid,uuid,text,text),public.bind_checkout(uuid,text),public.apply_payment_event(text,text,uuid,uuid,text,text,text,integer,text,boolean,text) to boletin_payments_api;
insert into private.schema_migrations(version) values('006-payments');
notify pgrst,'reload schema';
commit;
