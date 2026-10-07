# Keith's Blog

A React + Vite blog backed by Supabase. Visitors can read published posts. The configured admin can sign in on the Blog page to create, edit, publish/unpublish, and delete posts.

## Configure Supabase

1. In Supabase Authentication, create the admin user and disable public sign-ups.
2. Copy `.env.example` to `.env` and fill in the Supabase project URL, anon/publishable key, and the admin user's email. Do not put a `service_role` key in the frontend.
3. In the Supabase SQL editor, run the policies below after replacing `you@example.com` with the same admin email. These policies assume `photo_item` has a `post_id` foreign key to `post`; adjust that column name if your schema differs.
4. Remove any existing broad policies that allow anonymous or non-admin writes to `post`. PostgreSQL combines permissive policies with OR, so an old write policy could override these restrictions.

```sql
alter table public.post enable row level security;
alter table public.photo_item enable row level security;

grant select on public.post to anon, authenticated;
grant insert, update, delete on public.post to authenticated;
revoke insert, update, delete on public.post from anon;
grant select on public.photo_item to anon, authenticated;
revoke insert, update, delete on public.photo_item from anon, authenticated;

drop policy if exists "Public can read visible posts" on public.post;
create policy "Public can read visible posts"
on public.post for select to anon, authenticated
using (hidden = false);

drop policy if exists "Admin can manage posts" on public.post;
create policy "Admin can manage posts"
on public.post for all to authenticated
using (lower(auth.jwt() ->> 'email') = lower('you@example.com'))
with check (lower(auth.jwt() ->> 'email') = lower('you@example.com'));

drop policy if exists "Public can read photos for visible posts" on public.photo_item;
create policy "Public can read photos for visible posts"
on public.photo_item for select to anon, authenticated
using (
  exists (
    select 1
    from public.post
    where public.post.id = photo_item.post_id
      and public.post.hidden = false
  )
  or lower(auth.jwt() ->> 'email') = lower('you@example.com')
);
```

The email check in the UI only controls which editor controls are shown. Row Level Security is what enforces write access, so keep these database policies in place. Existing objects in Supabase Storage are unaffected; this editor manages post text and visibility, not image uploads.

## Development

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run lint` to run ESLint.
