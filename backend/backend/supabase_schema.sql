
-- Food Waste Reducer Supabase Database Schema

create table if not exists food_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  item_name text not null,
  category text not null,
  description text,
  expiry_date date,
  pickup_window text,
  location text,
  image_url text,
  status text default 'available',
  claimed_by uuid references auth.users(id),
  reserved_by uuid references auth.users(id),
  reserved_at timestamp with time zone,
  latitude double precision,
  longitude double precision,
  flagged boolean default false,
  created_at timestamp default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid,
  sender_id uuid references auth.users(id),
  receiver_id uuid references auth.users(id),
  message text not null,
  created_at timestamp default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  body text,
  read boolean default false,
  created_at timestamp default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp default now()
);
alter table admin_users enable row level security;

drop policy if exists "allow admin users read" on admin_users;

create policy "allow admin users read"
on admin_users
for select
to authenticated
using (true);
update food_listings
set reserved_by = claimed_by
where reserved_by is null
and claimed_by is not null;
create table food_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  item_name text not null,
  category text not null,
  description text,
  expiry_date date,
  pickup_window text,
  location text,
  image_url text,
  status text default 'available',
  claimed_by uuid references auth.users(id),
  created_at timestamp default now()
);latitude double precision
longitude double precision
status text
reserved_by uuid
reserved_at timestamp with time zonealter table messages enable row level security;

create policy "Allow authenticated insert messages"
on messages
for insert
to authenticated
with check (true);

create policy "Allow authenticated read messages"
on messages
for select
to authenticated
using (true);
