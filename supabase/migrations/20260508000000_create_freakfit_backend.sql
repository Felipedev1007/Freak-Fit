create extension if not exists pgcrypto;

create table if not exists public.freakfit_entities (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  user_email text not null,
  data jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists freakfit_entities_entity_user_idx
  on public.freakfit_entities (entity_name, user_email);

create index if not exists freakfit_entities_updated_idx
  on public.freakfit_entities (updated_date desc);

create or replace function public.set_freakfit_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists set_freakfit_entities_updated_date on public.freakfit_entities;

create trigger set_freakfit_entities_updated_date
before update on public.freakfit_entities
for each row
execute function public.set_freakfit_updated_date();

alter table public.freakfit_entities disable row level security;

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
