<h1 align="center">Keith's Blog</h1>

<p align="center">
  A responsive personal blog built with React, Vite, and Supabase. Read posts, browse post images, and follow links shared in post content.
</p>

<p align="center">
  <a href="https://sialanablog.netlify.app/">
    <img src="https://img.shields.io/badge/Visit_the_live_site-sialanablog.netlify.app-2563eb?style=for-the-badge" alt="Visit Keith's Blog" />
  </a>
</p>

###

<h2 align="center">Main Technologies</h2>

<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" height="40" alt="React" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" height="40" alt="Vite" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg" height="40" alt="Supabase" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" height="40" alt="JavaScript" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" height="40" alt="Tailwind CSS" />
  <img width="12" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" height="40" alt="CSS" />
</div>

###

<h2 align="center">About the Project</h2>

Keith's Blog is a responsive blog site with a Supabase-backed post editor for its administrator.

- Browse published blog posts and attached images.
- Links included in post content are displayed as clickable links.
- Switch between light and dark themes.
- The administrator can create, edit, hide, and delete posts, and attach images.
- The layout includes a mobile navigation menu and a shared footer.

###

<h2 align="center">Live Website</h2>

<p align="center">
  <a href="https://sialanablog.netlify.app/">https://sialanablog.netlify.app/</a>
</p>

###

<h2 align="center">Run Locally</h2>

Install [Node.js](https://nodejs.org/) and npm, then clone the repository and install its dependencies:

```sh
git clone https://github.com/keithrsialana/ks-blogsite.git
cd ks-blogsite
npm install
```

Copy `.env.example` to `.env` and set the Supabase project URL, anon/publishable key, and administrator email:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_ADMIN_EMAIL=you@example.com
```

Do not put a Supabase `service_role` key in the frontend. Start the development server with:

```sh
npm run dev
```

###

<h2 align="center">Supabase Setup and Security</h2>

1. In Supabase Authentication, create the administrator user and disable public sign-ups.
2. Ensure the `post` and `photo_item` tables exist, with `photo_item.post_id` referencing `post.id`. The policies below assume this relationship.
3. Create a public Storage bucket named `post-images`.
4. In the Supabase SQL editor, run the policies below after replacing `you@example.com` with the administrator's email.
5. Remove any existing broad policies that allow anonymous or non-admin writes to `post`, `photo_item`, or the `post-images` bucket. PostgreSQL combines permissive policies with OR, so a broad existing write policy could override these restrictions.

```sql
alter table public.post enable row level security;
alter table public.photo_item enable row level security;

grant select on public.post to anon, authenticated;
grant insert, update, delete on public.post to authenticated;
revoke insert, update, delete on public.post from anon;
grant select on public.photo_item to anon, authenticated;
grant insert, delete on public.photo_item to authenticated;
revoke insert, update, delete on public.photo_item from anon;

drop policy if exists "Public can read visible posts" on public.post;
create policy "Public can read visible posts"
on public.post for select to anon, authenticated
using (hidden = false);

drop policy if exists "Admin can read all posts" on public.post;
create policy "Admin can read all posts"
on public.post for select to authenticated
using (lower(auth.jwt() ->> 'email') = lower('you@example.com'));

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

drop policy if exists "Admin can manage post photos" on public.photo_item;
create policy "Admin can manage post photos"
on public.photo_item for all to authenticated
using (lower(auth.jwt() ->> 'email') = lower('you@example.com'))
with check (lower(auth.jwt() ->> 'email') = lower('you@example.com'));

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read post images" on storage.objects;
create policy "Public can read post images"
on storage.objects for select to public
using (bucket_id = 'post-images');

drop policy if exists "Admin can upload post images" on storage.objects;
create policy "Admin can upload post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and lower(auth.jwt() ->> 'email') = lower('you@example.com')
);

drop policy if exists "Admin can delete post images" on storage.objects;
create policy "Admin can delete post images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and lower(auth.jwt() ->> 'email') = lower('you@example.com')
);
```

The email check in the interface only controls which editor controls are shown. Row Level Security and Storage policies enforce write access and must remain in place. The editor uploads images to the public `post-images` bucket using randomized SHA-256 filenames, then stores each image path and its `post_id` in `photo_item`.

###

<h2 align="center">Project Commands</h2>

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint. |
