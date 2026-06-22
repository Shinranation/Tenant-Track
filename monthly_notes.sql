CREATE TABLE IF NOT EXISTS public.monthly_notes (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_monthly_note'
      AND conrelid = 'public.monthly_notes'::regclass
  ) THEN
    ALTER TABLE public.monthly_notes
    ADD CONSTRAINT unique_monthly_note UNIQUE (
      scope,
      target_id,
      billing_month,
      billing_year
    );
  END IF;
END
$$;

ALTER TABLE public.monthly_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'monthly_notes'
      AND policyname = 'Allow read monthly notes'
  ) THEN
    CREATE POLICY "Allow read monthly notes"
    ON public.monthly_notes FOR SELECT
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
      AND tablename = 'monthly_notes'
      AND policyname = 'Allow insert monthly notes'
  ) THEN
    CREATE POLICY "Allow insert monthly notes"
    ON public.monthly_notes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'monthly_notes'
      AND policyname = 'Allow update monthly notes'
  ) THEN
    CREATE POLICY "Allow update monthly notes"
    ON public.monthly_notes FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;
