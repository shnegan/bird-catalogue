-- Bird Catalogue: initial schema.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Then add your email:  insert into public.allowed_emails (email) values ('you@example.com');

create extension if not exists postgis with schema extensions;

-- Who may use the app. Anyone else who signs in sees and stores nothing.
create table if not exists public.allowed_emails (
  email text primary key
);
alter table public.allowed_emails enable row level security;
-- No policies: only the dashboard / service role can read or change this list.

create or replace function public.is_allowed()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- One row per uploaded photo. Original file (with EXIF) lives in the "photos" bucket.
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,  -- original file, untouched
  thumb_path text,                     -- small JPEG made in the browser for the gallery
  original_filename text,
  content_type text,
  size_bytes bigint,
  taken_at timestamptz,          -- from EXIF DateTimeOriginal when present
  latitude double precision,     -- from EXIF GPS when present (step 3 adds manual pins)
  longitude double precision,
  location extensions.geography(point, 4326)
    generated always as (
      case when latitude is not null and longitude is not null
        then extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
      end
    ) stored,
  exif jsonb,                    -- a few raw EXIF fields for later steps
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists photos_owner_created_idx on public.photos (owner, created_at desc);
create index if not exists photos_location_idx on public.photos using gist (location);

alter table public.photos enable row level security;

drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos
  for all to authenticated
  using (owner = auth.uid() and public.is_allowed())
  with check (owner = auth.uid() and public.is_allowed());

-- Private storage bucket. Files are stored under "<user id>/<file>".
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photo files" on storage.objects;
create policy "own photo files" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_allowed())
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_allowed());
