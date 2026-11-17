-- Additive MetroSathi prototype schema. REVIEW ONLY: do not run remotely without approval.
-- Public prefix avoids exposing a new PostgREST schema. No browser table policies.
begin;
create table if not exists public.metro_passengers (
 id uuid primary key, name text not null check(char_length(name) between 1 and 100),
 language text not null check(language in ('en-IN','ta-IN')), auth_subject uuid unique,
 is_demo boolean not null default true check(is_demo),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.metro_smart_cards (
 id uuid primary key, passenger_id uuid not null references public.metro_passengers(id),
 kind text not null check(kind in ('ncmc','legacy_cmrl_stored_value','qr_store_value_pass')),
 masked_number text not null check(masked_number ~ '^•••• •••• [0-9]{4}$'),
 status text not null check(status in ('active','inactive','policy_example')),
 balance numeric(12,2) not null check(balance>=0), is_demo boolean not null default true check(is_demo),
 issuer_note text not null, updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(id,passenger_id)
);
-- Signed amounts: travel is negative, recharge positive; attempts never imply applied balance.
create table if not exists public.metro_transactions (
 id uuid primary key, passenger_id uuid not null, card_id uuid not null,
 type text not null check(type in ('travel','recharge')), amount numeric(12,2) not null,
 status text not null check(status in ('pending','success','failed','unknown')),
 reference text not null unique check(reference like 'SIM-%'), description text not null check(char_length(description)<=200),
 occurred_at timestamptz not null, is_demo boolean not null default true check(is_demo),
 foreign key(card_id,passenger_id) references public.metro_smart_cards(id,passenger_id),
 check((type='travel' and amount<=0) or (type='recharge' and amount>=0))
);
create table if not exists public.metro_recharge_attempts (
 id uuid primary key, passenger_id uuid not null, card_id uuid not null,
 amount numeric(12,2) not null check(amount>0), reference text not null unique check(reference like 'SIM-%'),
 payment_status text not null check(payment_status in ('pending','success','failed','unknown')),
 card_update_status text not null check(card_update_status in ('pending','success','failed','unknown')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 is_demo boolean not null default true check(is_demo),
 foreign key(card_id,passenger_id) references public.metro_smart_cards(id,passenger_id),
 check(card_update_status<>'success' or payment_status='success')
);
create table if not exists public.metro_stations (
 code text primary key check(code ~ '^[A-Z][A-Z0-9_]{1,30}$'), name_en text not null,
 name_ta text, corridor text, operational boolean, source_url text not null check(source_url like 'https://chennaimetrorail.org/%'), verified_at date not null
);
create table if not exists public.metro_fares (
 origin text not null references public.metro_stations(code), destination text not null references public.metro_stations(code),
 fare_type text not null check(fare_type in ('standard','discounted_20_percent')), amount numeric(8,2) not null check(amount>=0),
 effective_from date, effective_to date, source_url text not null check(source_url like 'https://chennaimetrorail.org/%'),
 verified_at date not null, source_version text not null,
 primary key(origin,destination,fare_type,source_version), check(effective_to is null or effective_from is null or effective_to>=effective_from)
);
create table if not exists public.metro_knowledge_articles (
 id text primary key, topic text not null, language text not null check(language in ('en-IN','ta-IN')),
 question text not null, answer text not null, source_url text not null check(source_url like 'https://chennaimetrorail.org/%'),
 source_date date, verified_at date not null, active boolean not null default true
);
create table if not exists public.metro_support_tickets (
 id uuid primary key default gen_random_uuid(), ticket_number text not null unique,
 passenger_id uuid not null references public.metro_passengers(id), card_id uuid,
 category text not null check(category in ('recharge','card','travel','other')),
 description text not null check(char_length(trim(description)) between 10 and 800),
 language text not null check(language in ('en-IN','ta-IN')),
 status text not null default 'open' check(status in ('open','reviewing','closed')),
 priority text not null default 'normal' check(priority in ('normal','high')),
 is_demo boolean not null default true check(is_demo),
 idempotency_key uuid not null, confirmation_hash text not null check(confirmation_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(card_id,passenger_id) references public.metro_smart_cards(id,passenger_id),
 unique(passenger_id,idempotency_key), unique(passenger_id,confirmation_hash)
);
create table if not exists public.metro_audit_events (
 id uuid primary key default gen_random_uuid(), passenger_id uuid references public.metro_passengers(id),
 event_type text not null, record_id uuid, created_at timestamptz not null default now()
);
create index if not exists metro_cards_passenger on public.metro_smart_cards(passenger_id);
create index if not exists metro_transactions_passenger_time on public.metro_transactions(passenger_id,occurred_at desc);
create index if not exists metro_recharges_passenger_time on public.metro_recharge_attempts(passenger_id,created_at desc);
create index if not exists metro_tickets_passenger_time on public.metro_support_tickets(passenger_id,created_at desc);
create or replace function public.metro_touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin new.updated_at=now();return new;end $$;
create trigger metro_passengers_updated before update on public.metro_passengers for each row execute function public.metro_touch_updated_at();
create trigger metro_smart_cards_updated before update on public.metro_smart_cards for each row execute function public.metro_touch_updated_at();
create trigger metro_recharge_attempts_updated before update on public.metro_recharge_attempts for each row execute function public.metro_touch_updated_at();
create trigger metro_support_tickets_updated before update on public.metro_support_tickets for each row execute function public.metro_touch_updated_at();
alter table public.metro_passengers enable row level security;
revoke all on public.metro_passengers from anon, authenticated;
grant select,insert,update on public.metro_passengers to service_role;
alter table public.metro_smart_cards enable row level security;
revoke all on public.metro_smart_cards from anon, authenticated;
grant select,insert,update on public.metro_smart_cards to service_role;
alter table public.metro_transactions enable row level security;
revoke all on public.metro_transactions from anon, authenticated;
grant select,insert,update on public.metro_transactions to service_role;
alter table public.metro_recharge_attempts enable row level security;
revoke all on public.metro_recharge_attempts from anon, authenticated;
grant select,insert,update on public.metro_recharge_attempts to service_role;
alter table public.metro_stations enable row level security;
revoke all on public.metro_stations from anon, authenticated;
grant select,insert,update on public.metro_stations to service_role;
alter table public.metro_fares enable row level security;
revoke all on public.metro_fares from anon, authenticated;
grant select,insert,update on public.metro_fares to service_role;
alter table public.metro_knowledge_articles enable row level security;
revoke all on public.metro_knowledge_articles from anon, authenticated;
grant select,insert,update on public.metro_knowledge_articles to service_role;
alter table public.metro_support_tickets enable row level security;
revoke all on public.metro_support_tickets from anon, authenticated;
grant select,insert,update on public.metro_support_tickets to service_role;
alter table public.metro_audit_events enable row level security;
revoke all on public.metro_audit_events from anon, authenticated;
grant select,insert,update on public.metro_audit_events to service_role;
-- Only server service_role can execute. Actor MUST come from the verified server cookie.
create or replace function public.metro_create_ticket(
 p_passenger uuid, p_card uuid, p_category text, p_description text,
 p_language text, p_key uuid, p_confirmation text
) returns public.metro_support_tickets language plpgsql security invoker set search_path=public,pg_temp as $$
declare result public.metro_support_tickets;
begin
 if not exists(select 1 from public.metro_passengers where id=p_passenger and is_demo) then raise exception 'INVALID_ACTOR'; end if;
 if p_card is not null and not exists(select 1 from public.metro_smart_cards where id=p_card and passenger_id=p_passenger) then raise exception 'CARD_NOT_FOUND';end if;
 -- Serialize passenger ticket writes for retry safety across concurrent server instances.
 perform pg_advisory_xact_lock(hashtextextended(p_passenger::text,0));
 select * into result from public.metro_support_tickets where passenger_id=p_passenger and (idempotency_key=p_key or confirmation_hash=p_confirmation) limit 1;
 if found then
  if result.confirmation_hash<>p_confirmation then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return result;
 end if;
 insert into public.metro_support_tickets(ticket_number,passenger_id,card_id,category,description,language,idempotency_key,confirmation_hash)
 values('MS-DEMO-'||upper(replace(gen_random_uuid()::text,'-','')),p_passenger,p_card,p_category,trim(p_description),p_language,p_key,p_confirmation) returning * into result;
 insert into public.metro_audit_events(passenger_id,event_type,record_id) values(p_passenger,'prototype_ticket_created',result.id);
 return result;
end $$;
revoke all on function public.metro_create_ticket(uuid,uuid,text,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.metro_create_ticket(uuid,uuid,text,text,text,uuid,text) to service_role;
revoke all on function public.metro_touch_updated_at() from public,anon,authenticated;
commit;
