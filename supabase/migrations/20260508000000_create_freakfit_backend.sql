create extension if not exists pgcrypto;

create table if not exists public.freakfit_entities (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  user_email text not null,
  data jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.freakfit_accounts (
  id text primary key,
  email text not null unique,
  full_name text not null default '',
  avatar_url text not null default '',
  auth_provider text not null default 'email',
  role text not null default 'user',
  salt text not null default '',
  password_hash text not null default '',
  reset_code text not null default '',
  reset_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freakfit_entities_entity_user_idx
  on public.freakfit_entities (entity_name, user_email);

create index if not exists freakfit_entities_updated_idx
  on public.freakfit_entities (updated_date desc);

create index if not exists freakfit_accounts_email_idx
  on public.freakfit_accounts (email);

create or replace function public.set_freakfit_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create or replace function public.set_freakfit_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_freakfit_entities_updated_date on public.freakfit_entities;

create trigger set_freakfit_entities_updated_date
before update on public.freakfit_entities
for each row
execute function public.set_freakfit_updated_date();

drop trigger if exists set_freakfit_accounts_updated_at on public.freakfit_accounts;

create trigger set_freakfit_accounts_updated_at
before update on public.freakfit_accounts
for each row
execute function public.set_freakfit_updated_at();

alter table public.freakfit_entities disable row level security;
alter table public.freakfit_accounts disable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'freakfit-uploads',
  'freakfit-uploads',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "FreakFit public upload read" on storage.objects;
drop policy if exists "FreakFit public upload insert" on storage.objects;
drop policy if exists "FreakFit public upload update" on storage.objects;
drop policy if exists "FreakFit public upload delete" on storage.objects;

create policy "FreakFit public upload read"
on storage.objects
for select
using (bucket_id = 'freakfit-uploads');

create policy "FreakFit public upload insert"
on storage.objects
for insert
with check (bucket_id = 'freakfit-uploads');

create policy "FreakFit public upload update"
on storage.objects
for update
using (bucket_id = 'freakfit-uploads')
with check (bucket_id = 'freakfit-uploads');

create policy "FreakFit public upload delete"
on storage.objects
for delete
using (bucket_id = 'freakfit-uploads');
