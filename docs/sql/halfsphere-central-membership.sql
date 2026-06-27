-- HalfSphere Central Membership
-- Paste this whole file into Supabase SQL Editor for project hrtynofmjcumuanjvpxz.
-- This schema is independent from GyenBox app tables and uses Supabase auth.users.

create extension if not exists "pgcrypto";

create or replace function public.hs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  create type public.hs_membership_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hs_billing_interval as enum ('monthly', 'yearly', 'lifetime');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.hs_subscription_provider as enum ('manual', 'stripe', 'app_store', 'play_store', 'promo');
exception when duplicate_object then null;
end $$;

create table if not exists public.hs_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  public_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hs_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hs_membership_plans (
  id uuid primary key default gen_random_uuid(),
  product_code text not null references public.hs_products(code) on update cascade,
  code text not null,
  name text not null,
  description text,
  storage_quota_bytes bigint not null default 0,
  monthly_price_cents integer not null default 0,
  annual_price_cents integer not null default 0,
  max_devices integer not null default 1,
  max_file_size_bytes bigint not null default 1073741824,
  ai_credits_monthly integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_code, code)
);

create table if not exists public.hs_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null references public.hs_products(code) on update cascade,
  plan_id uuid not null references public.hs_membership_plans(id),
  status public.hs_membership_status not null default 'active',
  billing_interval public.hs_billing_interval not null default 'monthly',
  provider public.hs_subscription_provider not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  seats integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hs_membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  product_code text references public.hs_products(code) on update cascade,
  event_type text not null,
  previous_plan_code text,
  next_plan_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hs_subscriptions_user_status_idx on public.hs_subscriptions(user_id, status);
create index if not exists hs_subscriptions_product_user_idx on public.hs_subscriptions(product_code, user_id);
create index if not exists hs_subscriptions_provider_idx on public.hs_subscriptions(provider, provider_subscription_id);
create unique index if not exists hs_one_open_subscription_per_product_idx
  on public.hs_subscriptions(user_id, product_code)
  where status in ('trialing', 'active', 'past_due');
create index if not exists hs_membership_events_user_time_idx on public.hs_membership_events(user_id, created_at desc);

drop trigger if exists hs_products_touch on public.hs_products;
create trigger hs_products_touch before update on public.hs_products
for each row execute function public.hs_touch_updated_at();

drop trigger if exists hs_user_profiles_touch on public.hs_user_profiles;
create trigger hs_user_profiles_touch before update on public.hs_user_profiles
for each row execute function public.hs_touch_updated_at();

drop trigger if exists hs_membership_plans_touch on public.hs_membership_plans;
create trigger hs_membership_plans_touch before update on public.hs_membership_plans
for each row execute function public.hs_touch_updated_at();

drop trigger if exists hs_subscriptions_touch on public.hs_subscriptions;
create trigger hs_subscriptions_touch before update on public.hs_subscriptions
for each row execute function public.hs_touch_updated_at();

alter table public.hs_products enable row level security;
alter table public.hs_user_profiles enable row level security;
alter table public.hs_membership_plans enable row level security;
alter table public.hs_subscriptions enable row level security;
alter table public.hs_membership_events enable row level security;

drop policy if exists hs_products_read on public.hs_products;
create policy hs_products_read on public.hs_products for select using (is_active = true);

drop policy if exists hs_plans_read on public.hs_membership_plans;
create policy hs_plans_read on public.hs_membership_plans for select using (is_active = true);

drop policy if exists hs_profiles_own_read on public.hs_user_profiles;
create policy hs_profiles_own_read on public.hs_user_profiles for select using (auth.uid() = user_id);

drop policy if exists hs_subscriptions_own_read on public.hs_subscriptions;
create policy hs_subscriptions_own_read on public.hs_subscriptions for select using (auth.uid() = user_id);

drop policy if exists hs_events_own_read on public.hs_membership_events;
create policy hs_events_own_read on public.hs_membership_events for select using (auth.uid() = user_id);

insert into public.hs_products (code, name, public_name) values
  ('halfsphere', 'HalfSphere', 'HS Auth'),
  ('gyenbox', 'GyenBox', 'GyenBox'),
  ('gsyen', 'GSYEN', 'GSYEN')
on conflict (code) do update set
  name = excluded.name,
  public_name = excluded.public_name,
  is_active = true,
  updated_at = now();

insert into public.hs_membership_plans (
  product_code, code, name, description, storage_quota_bytes,
  monthly_price_cents, annual_price_cents, max_devices,
  max_file_size_bytes, ai_credits_monthly, sort_order
) values
  ('halfsphere', 'free', 'Free', 'Base HalfSphere account.', 0, 0, 0, 1, 0, 0, 10),
  ('gyenbox', 'free', 'Free', 'Starter private sync box.', 10737418240, 0, 0, 1, 1073741824, 50, 10),
  ('gyenbox', 'plus', 'Plus', 'Personal file territory with more storage.', 107374182400, 999, 9900, 3, 10737418240, 500, 20),
  ('gyenbox', 'professional', 'Professional', 'Power-user sync, share, and AI search.', 1099511627776, 1999, 19900, 10, 53687091200, 5000, 30),
  ('gyenbox', 'business', 'Business', 'Team territory with pooled storage.', 5497558138880, 4999, 49900, 50, 107374182400, 25000, 40),
  ('gsyen', 'free', 'Free', 'Starter GSYEN access.', 0, 0, 0, 1, 0, 50, 10),
  ('gsyen', 'plus', 'Plus', 'Expanded GSYEN workspace access.', 0, 999, 9900, 3, 0, 500, 20)
on conflict (product_code, code) do update set
  name = excluded.name,
  description = excluded.description,
  storage_quota_bytes = excluded.storage_quota_bytes,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  max_devices = excluded.max_devices,
  max_file_size_bytes = excluded.max_file_size_bytes,
  ai_credits_monthly = excluded.ai_credits_monthly,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

create or replace view public.hs_current_memberships as
select
  s.user_id,
  s.product_code,
  p.public_name as product_name,
  mp.code as plan_code,
  mp.name as plan_name,
  s.status,
  s.billing_interval,
  s.provider,
  mp.storage_quota_bytes,
  mp.max_devices,
  mp.max_file_size_bytes,
  mp.ai_credits_monthly,
  s.current_period_end,
  s.cancel_at_period_end,
  s.created_at,
  s.updated_at
from public.hs_subscriptions s
join public.hs_products p on p.code = s.product_code
join public.hs_membership_plans mp on mp.id = s.plan_id
where s.status in ('trialing', 'active', 'past_due');

create or replace function public.hs_activate_free_membership(target_product_code text)
returns public.hs_current_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  plan_row public.hs_membership_plans%rowtype;
  result_row public.hs_current_memberships%rowtype;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into plan_row
  from public.hs_membership_plans
  where product_code = target_product_code and code = 'free' and is_active = true
  limit 1;

  if plan_row.id is null then
    raise exception 'free plan not found for product %', target_product_code;
  end if;

  insert into public.hs_user_profiles (user_id, email)
  select current_user_id, u.email from auth.users u where u.id = current_user_id
  on conflict (user_id) do update set email = excluded.email, updated_at = now();

  insert into public.hs_subscriptions (user_id, product_code, plan_id, status, provider)
  select current_user_id, target_product_code, plan_row.id, 'active', 'manual'
  where not exists (
    select 1 from public.hs_subscriptions
    where user_id = current_user_id
      and product_code = target_product_code
      and status in ('trialing', 'active', 'past_due')
  );

  insert into public.hs_membership_events (user_id, product_code, event_type, next_plan_code)
  values (current_user_id, target_product_code, 'free_membership_activated', 'free');

  select * into result_row
  from public.hs_current_memberships
  where user_id = current_user_id and product_code = target_product_code
  limit 1;

  return result_row;
end;
$$;

revoke all on function public.hs_activate_free_membership(text) from public;
grant execute on function public.hs_activate_free_membership(text) to authenticated;
