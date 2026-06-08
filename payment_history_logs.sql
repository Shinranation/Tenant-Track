CREATE TABLE IF NOT EXISTS public.payment_history_logs (
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

ALTER TABLE public.payment_history_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_history_logs'
      AND policyname = 'Allow anon read payment history logs'
  ) THEN
    CREATE POLICY "Allow anon read payment history logs"
    ON public.payment_history_logs FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_history_logs'
      AND policyname = 'Allow anon insert payment history logs'
  ) THEN
    CREATE POLICY "Allow anon insert payment history logs"
    ON public.payment_history_logs FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END
$$;
