# TenantTrack

TenantTrack is a web-based property management and rent monitoring system for landlords who manage multiple buildings, rooms, and tenants. It gives property owners one centralized place to view rent, water, and electricity payment statuses with color-coded indicators, making it easier to spot paid, upcoming, and overdue accounts.

The app is planned to store tenant profiles, lease contracts, due dates, payment history, and occupancy records. Compared with spreadsheet-based tracking, TenantTrack is designed to be faster, clearer, and easier to maintain as rental operations grow.

## Tech Stack

- React
- Vite
- Supabase

## UI Direction

The starter dashboard follows the provided TenantTrack mockup: a blue title bar, gray workspace, compact building panels, and color-coded payment dots for fast room scanning.

## Project Structure

```text
TenantTrack/
  src/
    components/
      BuildingCard.jsx
      DashboardStats.jsx
      StatusLegend.jsx
    lib/
      supabaseClient.js
    App.jsx
    main.jsx
    styles.css
  .env.example
  index.html
  package.json
```

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env` file using `.env.example` when you are ready to connect Supabase.

## Supabase Setup

1. Create a new Supabase project.
2. Open the Supabase SQL Editor.
3. Run the schema below.
4. Add your project URL and anon key to `.env`.

If the app shows `Payment history setup needed`, run `payment_history_logs.sql` in the Supabase SQL Editor.
5. Restart the Vite dev server.

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Schema

```sql
CREATE TABLE public.buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT buildings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  building_id uuid,
  room_name text NOT NULL,
  monthly_rent numeric,
  status text DEFAULT 'available'::text CHECK (
    status = ANY (ARRAY['available'::text, 'occupied'::text, 'unavailable'::text])
  ),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT rooms_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id)
);

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  contact_number text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

CREATE TABLE public.lease_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid,
  room_id uuid,
  start_date date,
  end_date date,
  due_day integer,
  deposit numeric,
  advance_payment numeric,
  status text DEFAULT 'active'::text CHECK (
    status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text])
  ),
  CONSTRAINT lease_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT lease_contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT lease_contracts_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);

CREATE TABLE public.rent_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid,
  billing_month integer,
  billing_year integer,
  amount_due numeric,
  amount_paid numeric,
  due_date date,
  payment_date date,
  status text CHECK (
    status = ANY (ARRAY['paid'::text, 'upcoming'::text, 'overdue'::text, 'partial'::text])
  ),
  CONSTRAINT rent_payments_pkey PRIMARY KEY (id),
  CONSTRAINT rent_payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id)
);

CREATE TABLE public.utility_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid,
  utility_type text CHECK (
    utility_type = ANY (ARRAY['water'::text, 'electricity'::text])
  ),
  amount_due numeric,
  amount_paid numeric,
  due_date date,
  payment_date date,
  status text CHECK (
    status = ANY (ARRAY['paid'::text, 'upcoming'::text, 'overdue'::text, 'partial'::text])
  ),
  billing_month integer,
  billing_year integer,
  CONSTRAINT utility_payments_pkey PRIMARY KEY (id),
  CONSTRAINT utility_payments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id)
);

CREATE TABLE public.monthly_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (
    scope = ANY (ARRAY['building'::text, 'room'::text])
  ),
  target_id uuid NOT NULL,
  billing_month integer NOT NULL,
  billing_year integer NOT NULL,
  note text DEFAULT ''::text,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT monthly_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.allowed_users (
  email text NOT NULL,
  CONSTRAINT allowed_users_pkey PRIMARY KEY (email)
);

CREATE TABLE public.payment_history_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room_id uuid,
  contract_id uuid,
  payment_table text NOT NULL CHECK (
    payment_table = ANY (ARRAY['rent_payments'::text, 'utility_payments'::text])
  ),
  payment_id uuid,
  payment_type text NOT NULL CHECK (
    payment_type = ANY (ARRAY['rent'::text, 'water'::text, 'light'::text])
  ),
  utility_type text,
  billing_month integer,
  billing_year integer,
  old_amount_paid numeric DEFAULT 0,
  new_amount_paid numeric DEFAULT 0,
  old_status text,
  new_status text,
  changed_by text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payment_history_logs_pkey PRIMARY KEY (id),
  CONSTRAINT payment_history_logs_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id),
  CONSTRAINT payment_history_logs_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id)
);
```

### Development Policies

For local development, enable read access for the frontend anon key:

```sql
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utility_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read buildings"
ON public.buildings FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read rooms"
ON public.rooms FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read tenants"
ON public.tenants FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read lease contracts"
ON public.lease_contracts FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read rent payments"
ON public.rent_payments FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read utility payments"
ON public.utility_payments FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon read monthly notes"
ON public.monthly_notes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon read allowed users"
ON public.allowed_users FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon read payment history logs"
ON public.payment_history_logs FOR SELECT
TO anon, authenticated
USING (true);
```

The room pop-out can update and insert payment data. During development, add write policies only if you are comfortable allowing the anon key to edit data:

```sql
CREATE POLICY "Allow anon update rooms"
ON public.rooms FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update tenants"
ON public.tenants FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update lease contracts"
ON public.lease_contracts FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon update rent payments"
ON public.rent_payments FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon insert rent payments"
ON public.rent_payments FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon update utility payments"
ON public.utility_payments FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon insert utility payments"
ON public.utility_payments FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon insert monthly notes"
ON public.monthly_notes FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon update monthly notes"
ON public.monthly_notes FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon insert payment history logs"
ON public.payment_history_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

For production, replace these broad development policies with authenticated user policies tied to landlord accounts.
