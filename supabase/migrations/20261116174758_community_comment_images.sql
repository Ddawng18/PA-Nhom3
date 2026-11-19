alter table public.community_comments add column image_url text;
alter table public.community_comments drop constraint community_comments_body_check;
alter table public.community_comments add constraint community_comments_body_check
  check (char_length(btrim(body)) <= 2000 and
    (char_length(btrim(body)) > 0 or image_url is not null));
