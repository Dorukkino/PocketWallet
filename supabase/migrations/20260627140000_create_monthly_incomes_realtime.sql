-- Per-month income records for cross-device budget sync.
CREATE TABLE public.monthly_incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  month_key text NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'TRY' CHECK (
    currency = ANY (ARRAY['TRY'::text, 'USD'::text, 'EUR'::text, 'GBP'::text])
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key)
);

CREATE INDEX monthly_incomes_user_id_idx ON public.monthly_incomes (user_id);

ALTER TABLE public.monthly_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own monthly incomes"
  ON public.monthly_incomes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly incomes"
  ON public.monthly_incomes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly incomes"
  ON public.monthly_incomes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly incomes"
  ON public.monthly_incomes
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all monthly incomes"
  ON public.monthly_incomes
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE TRIGGER monthly_incomes_set_updated_at
  BEFORE UPDATE ON public.monthly_incomes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable Realtime (WAL) broadcasts for income and expense sync.
ALTER TABLE public.monthly_incomes REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_incomes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
