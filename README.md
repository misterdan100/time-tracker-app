# Time Tracker App

A time tracking application for managing clients, projects, and time entries. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Authentication**: Supabase Auth (email + password), no public sign-up
- **Team accounts**: the admin creates member accounts and can view them read-only ("View as")
- **Client Management**: Add, edit, and delete clients
- **Project Management**: Track projects with status, work type, and location
- **Time Tracking**: Log time entries with date and hours
- **Invoices**: Per-client invoices with PDF export
- **Dashboard**: Overview with statistics and weekly time chart
- **Data Persistence**: Supabase Postgres with Row Level Security
- **Export/Import**: JSON export and import functionality

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Router
- date-fns
- Recharts

## Authentication

Authentication is handled by **Supabase Auth** (email + password). For local development, create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Note:** The `.env` file is included in `.gitignore` and will not be committed to the repository.

### Password recovery

The login screen has a **Forgot password?** link. It sends a Supabase recovery email whose link
returns to `/reset-password`, where the user picks a new password. No external service is required:
Supabase's built-in email sender is enough.

The emailed link **always points at the deployed app**, even when the reset is requested from a dev
server, so it can be opened from any device. To point it somewhere else — testing the reset screen
locally, for instance — set `VITE_SITE_URL` in `.env`:

```env
VITE_SITE_URL=http://localhost:5173
```

Required setup in the Supabase dashboard (**Authentication → URL Configuration**):

- **Site URL**: `https://time-tracker-app-sandy.vercel.app`
- **Redirect URLs**: `https://time-tracker-app-sandy.vercel.app/reset-password`
  (add `http://localhost:5173/reset-password` too if you use `VITE_SITE_URL` for local testing)

If a recovery link is not allow-listed Supabase falls back to the Site URL; the app detects the
recovery fragment and forwards it to `/reset-password` anyway, so the flow still works.

**Email limits:** the built-in sender is rate limited (~2 emails/hour) and intended for testing. If
messages stop arriving, plug in a free SMTP provider under **Authentication → Emails → SMTP
Settings** (e.g. Brevo, 300 emails/day free, or Resend, 3.000/month free) — both have free tiers,
no card required.

## Team accounts (admin panel)

There is no public sign-up. The admin creates accounts for the people who work for them from
**Team** (`/admin`), sets a temporary password, and can rename, re-password, deactivate or delete
those member accounts. **View as** opens a member's dashboard, projects and profile read-only.

How it fits together:

- `public.team_members` (in `supabase-schema.sql`, TEAM section) holds each account's role
  (`admin` | `member`), its lead and an `active` flag. Only the service role writes it, so nobody can
  promote themselves. The lead gets read-only RLS access to their members' rows.
- Account changes go through a Vercel Function, `api/admin.ts`, which uses the Supabase
  **service role key** and only accepts requests from an active admin. It can never modify the
  admin's own account.
- A signed-in user without an active `team_members` row sees an "account not enabled" screen.
- **Project assignment:** the admin opens projects to members from the project page (Team card) or
  from Team → member → Projects (`public.project_members`). Members see only their assigned projects
  (no client details) and log hours only on those; RLS enforces it. Removing an assignment keeps the
  member's hours, read-only. The admin sees each member's hours per project on the Team card
  (not part of the admin's own totals). To undo the SQL, run `supabase-rollback-assignments.sql`.
- **Member invoices:** members bill their lead instead of a client (`invoices.bill_to_user_id`,
  `client_id` null). In the member's account the lead appears as their only "client" (built from the
  lead's studio profile), so numbering, periods and PDFs work the same. The admin sets each member's
  rate in Team → Set rate (`team_members.hourly_rate/currency`); members can't change it. Once a
  member finalizes an invoice it and its hours are locked for them; the admin sees it under
  Invoices → From team and marks it paid or returns it to draft (`mark_team_invoice_paid`,
  `return_team_invoice` RPCs). To undo the SQL, run `supabase-rollback-member-invoices.sql`.
- **Team hours in client invoices:** a new client invoice can also bill the hours members logged on
  that client's projects ("Include team hours", on by default), at the client rate and merged into
  each project line — the PDF looks the same as before. `time_entries.lead_invoice_id` links those
  hours to the client invoice (independent of the member's own invoice to the lead) and locks them
  for the member; deleting the invoice releases them. Every invoice is finalized through the
  `finalize_invoice` RPC, which locks the hours and finalizes the invoice in one transaction. Members
  with billed hours or sent invoices can only be deactivated, not deleted. To undo the SQL, run
  `supabase-rollback-team-hours.sql` (and revert the app code: it needs `finalize_invoice`).
- **Backups:** the admin's **Export JSON** also saves their studio profile and a read-only copy of
  the team's data (members and rates, assignments, hours with their billing links, invoices members
  sent, members' profiles). **Import JSON** restores only the admin's own data and profile; the team
  section is never written back. The file contains payment and ID details — store it privately.

One-time setup:

1. **Supabase → Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up".
2. **Supabase → SQL Editor**: run `supabase-schema.sql` (idempotent), then insert the first admin row
   by hand (kept out of this public repo):
   ```sql
   insert into public.team_members (user_id, role, display_name)
   values ('<your auth.users id>', 'admin', '<your name>')
   on conflict (user_id) do update set role = 'admin', lead_id = null, active = true;
   ```
   To undo the TEAM section, run `supabase-rollback-team.sql` (touches no business data).
3. **Supabase → Settings → API Keys**: create a secret key and set it as
   `SUPABASE_SERVICE_ROLE_KEY` — in `.env.local` for development and in Vercel (Production and
   Preview) for deployments. **Never prefix it with `VITE_`**: that would ship it to the browser.

```env
# .env.local (gitignored)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

## Local Development

`npm run dev` also serves `api/admin.ts` at `/api/admin` (a small dev-only Vite middleware), so the
Team panel works locally once `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`. Local development uses
the same Supabase project as production, so treat test accounts as real and delete them afterwards.

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Deployment to Vercel

### Prerequisites

- A GitHub account with the project repository
- A Vercel account (free tier)

### Steps

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/time-tracker-app.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the Vite configuration
   - Click "Deploy"

3. **Configure Environment Variables in Vercel:**
   - After importing the project, go to "Settings" > "Environment Variables"
   - Add the following variables:
     - `VITE_SUPABASE_URL`: your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: your Supabase anon key
     - `SUPABASE_SERVICE_ROLE_KEY`: your Supabase secret key (server-only, used by `api/admin.ts`)
   - Click "Save" and redeploy the project (env changes only reach new deployments)

4. **Configuration:**
   - The `vercel.json` file is already configured for Vite (the SPA rewrite skips `/api/*`)
   - The build command is `npm run build` (type-checks `src/` and `api/`)
   - The output directory is `dist`

## Project Structure

```
time-tracker-app/
├── api/
│   ├── admin.ts          # Vercel Function: team account administration
│   └── _contract.ts      # Request/response types shared with the client
├── src/
│   ├── components/
│   │   ├── dialogs/      # Dialog components
│   │   ├── layout/       # Layout components (Sidebar)
│   │   └── ui/           # shadcn/ui components
│   ├── context/
│   │   ├── AppContext.tsx    # Application state management
│   │   └── AuthContext.tsx   # Authentication state
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Clients.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── ClientDetail.tsx
│   │   ├── Invoices.tsx
│   │   ├── AdminTeam.tsx     # Team panel (admin only)
│   │   └── LoginPage.tsx
│   ├── types/
│   │   └── index.ts      # TypeScript type definitions
│   ├── App.tsx
│   └── index.css
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── vercel.json
```

## License

MIT
