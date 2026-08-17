-- App Store readiness for ElloContent only.
-- This project is shared with Ellosuit, so all new objects use an
-- ellocontent-specific name where a collision could affect the other app.

alter table public.community_posts
  add column if not exists moderation_status text not null default 'visible';

alter table public.community_posts
  drop constraint if exists community_posts_moderation_status_check;

alter table public.community_posts
  add constraint community_posts_moderation_status_check
  check (moderation_status in ('visible', 'under_review', 'removed'));

alter table public.community_post_comments
  add column if not exists moderation_status text not null default 'visible';

alter table public.community_post_comments
  drop constraint if exists community_post_comments_moderation_status_check;

alter table public.community_post_comments
  add constraint community_post_comments_moderation_status_check
  check (moderation_status in ('visible', 'under_review', 'removed'));

create table if not exists public.community_user_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint community_user_blocks_not_self check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.community_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'illegal', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_user_id)
);

create table if not exists public.community_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.community_post_comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'violence', 'illegal', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id)
);

-- APNs registrations are isolated from Ellosuit because an APNs device token
-- belongs to one app/topic and cannot safely share the other app's table.
create table if not exists public.ellocontent_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios' check (platform = 'ios'),
  environment text not null default 'production' check (environment in ('development', 'production')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_user_blocks_blocked
  on public.community_user_blocks(blocked_user_id);
create index if not exists idx_community_post_reports_post
  on public.community_post_reports(post_id);
create index if not exists idx_community_comment_reports_comment
  on public.community_comment_reports(comment_id);
create index if not exists idx_ellocontent_device_tokens_user
  on public.ellocontent_device_tokens(user_id) where enabled = true;

alter table public.community_user_blocks enable row level security;
alter table public.community_post_reports enable row level security;
alter table public.community_comment_reports enable row level security;
alter table public.ellocontent_device_tokens enable row level security;

drop policy if exists "Users manage own community blocks" on public.community_user_blocks;
create policy "Users manage own community blocks"
on public.community_user_blocks
for all to authenticated
using (blocker_user_id = auth.uid())
with check (blocker_user_id = auth.uid());

drop policy if exists "Users create own post reports" on public.community_post_reports;
create policy "Users create own post reports"
on public.community_post_reports
for insert to authenticated
with check (
  reporter_user_id = auth.uid()
  and exists (
    select 1 from public.community_posts p
    where p.id = post_id and p.user_id <> auth.uid()
  )
);

drop policy if exists "Users view own post reports" on public.community_post_reports;
create policy "Users view own post reports"
on public.community_post_reports
for select to authenticated
using (reporter_user_id = auth.uid());

drop policy if exists "Users create own comment reports" on public.community_comment_reports;
create policy "Users create own comment reports"
on public.community_comment_reports
for insert to authenticated
with check (
  reporter_user_id = auth.uid()
  and exists (
    select 1 from public.community_post_comments c
    where c.id = comment_id and c.user_id <> auth.uid()
  )
);

drop policy if exists "Users view own comment reports" on public.community_comment_reports;
create policy "Users view own comment reports"
on public.community_comment_reports
for select to authenticated
using (reporter_user_id = auth.uid());

-- Tokens are only accessed by the authenticated Edge Function through its
-- service-role client. There are intentionally no client-facing policies.

drop policy if exists "Community posts are publicly viewable" on public.community_posts;
drop policy if exists "Visible community posts are publicly viewable" on public.community_posts;
create policy "Visible community posts are publicly viewable"
on public.community_posts
for select
using (moderation_status = 'visible' or user_id = auth.uid());

drop policy if exists "Community post comments are viewable by authenticated" on public.community_post_comments;
drop policy if exists "Visible community comments are viewable by authenticated" on public.community_post_comments;
create policy "Visible community comments are viewable by authenticated"
on public.community_post_comments
for select to authenticated
using (moderation_status = 'visible' or user_id = auth.uid());

create or replace function public.ellocontent_filter_community_text()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  candidate text;
begin
  candidate := lower(coalesce(
    case when tg_table_name = 'community_posts' then new.caption else new.content end,
    ''
  ));

  if candidate ~ '(pornografia|pornographic|pedofilia|child[ -]?porn|estupro|rape\b|ameaça de morte|death threat|nazismo|terrorismo)' then
    raise exception using
      errcode = '23514',
      message = 'Este conteúdo não pode ser publicado na comunidade.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ellocontent_filter_community_posts on public.community_posts;
create trigger trg_ellocontent_filter_community_posts
before insert or update of caption on public.community_posts
for each row execute function public.ellocontent_filter_community_text();

drop trigger if exists trg_ellocontent_filter_community_comments on public.community_post_comments;
create trigger trg_ellocontent_filter_community_comments
before insert or update of content on public.community_post_comments
for each row execute function public.ellocontent_filter_community_text();

create or replace function public.ellocontent_review_reported_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'community_post_reports' then
    if (select count(*) from public.community_post_reports where post_id = new.post_id) >= 3 then
      update public.community_posts
      set moderation_status = 'under_review'
      where id = new.post_id and moderation_status = 'visible';
    end if;
  elsif tg_table_name = 'community_comment_reports' then
    if (select count(*) from public.community_comment_reports where comment_id = new.comment_id) >= 3 then
      update public.community_post_comments
      set moderation_status = 'under_review'
      where id = new.comment_id and moderation_status = 'visible';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.ellocontent_review_reported_content() from public;

drop trigger if exists trg_ellocontent_review_post_reports on public.community_post_reports;
create trigger trg_ellocontent_review_post_reports
after insert on public.community_post_reports
for each row execute function public.ellocontent_review_reported_content();

drop trigger if exists trg_ellocontent_review_comment_reports on public.community_comment_reports;
create trigger trg_ellocontent_review_comment_reports
after insert on public.community_comment_reports
for each row execute function public.ellocontent_review_reported_content();
