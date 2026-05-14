create extension if not exists pgcrypto;

create table if not exists public.hairdressers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60, 90, 120)),
  price numeric null,
  description text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  hairdresser_id uuid not null references public.hairdressers(id),
  service_id uuid not null references public.services(id),
  date date not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes in (15, 30, 45, 60, 90, 120)),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'confirmed', 'cancelled', 'expired', 'completed', 'no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,
  amount_paid_cents integer null,
  currency text not null default 'eur',
  paid_at timestamptz null,
  notes text null,
  delay_minutes integer not null default 0 check (delay_minutes >= 0),
  source text not null default 'public' check (source in ('public', 'admin')),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  block_type text not null check (block_type in (
    'national_holiday',
    'madrid_region_holiday',
    'madrid_local_holiday',
    'alcobendas_local_holiday',
    'alberto_vacation',
    'ruben_vacation',
    'full_closure',
    'partial_closure',
    'alberto_manual',
    'ruben_manual',
    'other'
  )),
  hairdresser_id uuid null references public.hairdressers(id),
  affects_all_hairdressers boolean not null default false,
  start_date date not null,
  end_date date not null,
  start_time time null,
  end_time time null,
  all_day boolean not null default true,
  internal_reason text null,
  visible_to_clients boolean not null default false,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_valid_dates check (end_date >= start_date),
  constraint schedule_blocks_valid_times check (all_day or (start_time is not null and end_time is not null and end_time > start_time))
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  role text not null check (role in ('admin_alberto', 'admin_ruben', 'super_admin')),
  hairdresser_id uuid null references public.hairdressers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_phone_idx on public.clients(phone);
create index if not exists clients_name_idx on public.clients using gin (to_tsvector('simple', name));
create index if not exists appointments_date_hairdresser_idx on public.appointments(date, hairdresser_id, start_time);
create index if not exists appointments_status_idx on public.appointments(status);
create index if not exists schedule_blocks_dates_idx on public.schedule_blocks(start_date, end_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hairdressers_set_updated_at on public.hairdressers;
create trigger hairdressers_set_updated_at before update on public.hairdressers for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

drop trigger if exists schedule_blocks_set_updated_at on public.schedule_blocks;
create trigger schedule_blocks_set_updated_at before update on public.schedule_blocks for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();

drop trigger if exists admin_profiles_set_updated_at on public.admin_profiles;
create trigger admin_profiles_set_updated_at before update on public.admin_profiles for each row execute function public.set_updated_at();

insert into public.hairdressers (id, name, slug, active)
values
  ('00000000-0000-0000-0000-000000000001', 'Alberto', 'alberto', true),
  ('00000000-0000-0000-0000-000000000002', 'Rubén', 'ruben', true)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, active = excluded.active;

insert into public.services (id, name, duration_minutes, price, description, active)
values
  ('10000000-0000-0000-0000-000000000001', 'Corte', 15, null, null, true),
  ('10000000-0000-0000-0000-000000000002', 'Barba', 15, null, null, true),
  ('10000000-0000-0000-0000-000000000003', 'Corte + barba', 15, null, null, true),
  ('10000000-0000-0000-0000-000000000004', 'Tinte', 15, null, null, true),
  ('10000000-0000-0000-0000-000000000005', 'Peinado', 15, null, null, true),
  ('10000000-0000-0000-0000-000000000006', 'Otro', 15, null, null, true)
on conflict (id) do update
set name = excluded.name,
    duration_minutes = excluded.duration_minutes,
    active = excluded.active;

insert into public.settings (key, value)
values
  ('public_booking_mode', '"confirmed"'::jsonb),
  ('min_booking_notice_hours', '2'::jsonb),
  ('max_booking_days_ahead', '60'::jsonb),
  ('allow_any_hairdresser', 'true'::jsonb),
  ('business_name', '"Agenda Peluquería"'::jsonb),
  ('default_whatsapp_message', '"Hola, te contactamos desde la peluquería sobre tu cita."'::jsonb)
on conflict (key) do update set value = excluded.value;

alter table public.hairdressers enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.settings enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "Public can read active hairdressers" on public.hairdressers;
create policy "Public can read active hairdressers"
on public.hairdressers for select
using (active = true);

drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services"
on public.services for select
using (active = true);

drop policy if exists "Admins can read admin profiles" on public.admin_profiles;
create policy "Admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (user_id = auth.uid());

-- El MVP usa endpoints de Next.js con SUPABASE_SERVICE_ROLE_KEY para operaciones privadas,
-- disponibilidad pública y creación de reservas públicas. Esa clave nunca debe exponerse en cliente.
