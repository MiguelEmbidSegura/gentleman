alter table public.clients
  add column if not exists email text null;

create index if not exists clients_email_idx on public.clients(email);
