drop policy if exists "Community post likes are viewable by authenticated" on public.community_post_likes;
create policy "Community post likes are publicly viewable"
on public.community_post_likes
for select
to public
using (true);

drop policy if exists "Community post comments are viewable by authenticated" on public.community_post_comments;
create policy "Community post comments are publicly viewable"
on public.community_post_comments
for select
to public
using (true);