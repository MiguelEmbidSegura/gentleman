alter table public.appointments
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists stripe_checkout_session_id text null,
  add column if not exists stripe_payment_intent_id text null,
  add column if not exists amount_paid_cents integer null,
  add column if not exists currency text not null default 'eur',
  add column if not exists paid_at timestamptz null;

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('pending_payment', 'confirmed', 'cancelled', 'expired', 'completed', 'no_show'));

alter table public.appointments
  drop constraint if exists appointments_payment_status_check;

alter table public.appointments
  add constraint appointments_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));

update public.appointments
set payment_status = 'unpaid'
where payment_status is null;

create index if not exists appointments_stripe_checkout_session_idx
on public.appointments(stripe_checkout_session_id);
