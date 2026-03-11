# EVText

Simple full-stack messenger for small private friend groups.

## Features
- Realtime messaging (SSE)
- Media sharing (images, video, audio)
- Simple shared-password auth
- Invite links
- PWA installable + offline shell
- Browser + push notifications

## Tech Stack
- Next.js App Router
- TailwindCSS
- Prisma (SQLite dev, PostgreSQL optional for prod)
- Web Push for background notifications
- Vercel Blob for production uploads (optional)

## Setup
1. Install deps:

```bash
npm install
```

2. Copy env file:

```bash
copy .env.example .env
```

3. Configure `.env`:
- `APP_SHARED_PASSWORD`
- `DATABASE_URL`
- `VAPID_*` keys (for push notifications)
- `BLOB_READ_WRITE_TOKEN` (optional)

4. Generate Prisma client and migrate:

```bash
npx prisma generate
npx prisma migrate dev
```

5. Run dev server:

```bash
npm run dev
```

## Environment Variables
Required:
- `APP_SHARED_PASSWORD`
- `DATABASE_URL`

Push notifications (recommended):
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Uploads in production (optional):
- `BLOB_READ_WRITE_TOKEN`

Optional base URL for invites:
- `NEXT_PUBLIC_APP_URL`

Optional Prisma schema override:
- `PRISMA_SCHEMA` (e.g. `prisma/schema.postgres.prisma` on Vercel)
- `DIRECT_URL` (optional, for Postgres migrations)
- `PRISMA_DB_PUSH` (set to `1` to auto-create tables during build)

## Folder Structure
- `app/` Next.js app router pages + API routes
- `components/` UI components
- `lib/` server utilities (auth, db, realtime, push)
- `prisma/` database schema
- `public/` PWA assets + service worker
- `public/uploads/` local dev uploads

## Database Schema (Prisma)
Main models:
- `User` display name only
- `Session` simple cookie session
- `Room` chat room
- `RoomMember` membership + role
- `Message` text + media
- `Media` file metadata
- `Invite` join code
- `PushSubscription` for web push

## Vercel Deployment
1. Push the repo to GitHub.
2. Create a Vercel project, import the repo.
3. Add env vars in Vercel project settings:
   - `APP_SHARED_PASSWORD`
   - `DATABASE_URL` (Postgres connection string)
   - `PRISMA_SCHEMA=prisma/schema.postgres.prisma`
   - `DIRECT_URL` (optional)
   - `PRISMA_DB_PUSH=1` (first deploy to create tables)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - `BLOB_READ_WRITE_TOKEN` (if using Vercel Blob)
4. Run migrations in Vercel build or manually:
   - `npx prisma migrate deploy --schema prisma/schema.postgres.prisma`

## PWA Installation
- Open the site in Chrome/Edge.
- Use the browser install prompt or the install icon in the address bar.
- After install, notifications and background push will work if permissions are granted.

## Notifications
- Click "Enable notifications" after login.
- This registers the service worker and saves a push subscription.
- Background notifications use Web Push, so VAPID keys are required.
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must match `VAPID_PUBLIC_KEY`.

## Notes
- Realtime updates use Server-Sent Events (SSE). For small private groups this is lightweight and reliable.
- Local uploads are saved to `public/uploads`.
- For production, enable Vercel Blob for durable storage.
