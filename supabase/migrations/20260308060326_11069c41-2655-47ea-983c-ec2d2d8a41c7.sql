-- Social interactions for community posts
create table if not exists public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_community_post_likes_post_id on public.community_post_likes(post_id);
create index if not exists idx_community_post_comments_post_id on public.community_post_comments(post_id);
create index if not exists idx_community_post_comments_created_at on public.community_post_comments(created_at desc);

alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;

drop policy if exists "Community post likes are viewable by authenticated" on public.community_post_likes;
create policy "Community post likes are viewable by authenticated"
on public.community_post_likes
for select
to authenticated
using (true);

drop policy if exists "Users can like posts" on public.community_post_likes;
create policy "Users can like posts"
on public.community_post_likes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own likes" on public.community_post_likes;
create policy "Users can remove own likes"
on public.community_post_likes
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Community post comments are viewable by authenticated" on public.community_post_comments;
create policy "Community post comments are viewable by authenticated"
on public.community_post_comments
for select
to authenticated
using (true);

drop policy if exists "Users can create own comments" on public.community_post_comments;
create policy "Users can create own comments"
on public.community_post_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.community_post_comments;
create policy "Users can update own comments"
on public.community_post_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.community_post_comments;
create policy "Users can delete own comments"
on public.community_post_comments
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.sync_community_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts
    set likes_count = coalesce(likes_count, 0) + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.community_posts
    set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_community_post_likes_count_insert on public.community_post_likes;
create trigger trg_sync_community_post_likes_count_insert
after insert on public.community_post_likes
for each row
execute function public.sync_community_post_likes_count();

drop trigger if exists trg_sync_community_post_likes_count_delete on public.community_post_likes;
create trigger trg_sync_community_post_likes_count_delete
after delete on public.community_post_likes
for each row
execute function public.sync_community_post_likes_count();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_community_post_comments_updated_at on public.community_post_comments;
create trigger trg_community_post_comments_updated_at
before update on public.community_post_comments
for each row
execute function public.touch_updated_at();