-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: table/extension creation is idempotent, and the seed insert
-- skips rows that already exist.

create extension if not exists pgcrypto;

create table if not exists channel_senders (
  id uuid primary key default gen_random_uuid(),
  match_pattern text not null unique,  -- substring matched against the sender's email address, e.g. 'seesaw'
  channel text not null,               -- display name shown in the app, e.g. 'Seesaw'
  hue integer not null default 0,      -- matches the frontend's chip colour palette
  created_at timestamptz not null default now()
);

insert into channel_senders (match_pattern, channel, hue) values
  ('seesaw', 'Seesaw', 230),
  ('qkr', 'QKR', 145),
  ('rydeunited', 'Ryde United FC', 50),
  ('sydneykidsmedical', 'Sydney Kids Medical', 10),
  ('horizonstrata', 'Horizon Strata', 290),
  ('figtreefamilies', 'Fig Tree Families', 180)
on conflict (match_pattern) do nothing;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'sarah',
  provider_message_id text unique,     -- Postmark's MessageID, used to ignore webhook retries
  channel text not null,
  hue integer not null default 0,
  from_email text,
  sender_label text,                   -- Claude's guess at the true original sender, for forwarded mail whose envelope From is the forwarder
  subject text,
  raw_body text,
  title text,
  summary text,
  action_required boolean not null default false,
  date_label text,
  event_date date,                     -- the real calendar date dateLabel refers to, if any; falls back to created_at for bucketing when null
  read boolean not null default false,
  added_to_calendar boolean not null default false,
  created_at timestamptz not null default now()
);
