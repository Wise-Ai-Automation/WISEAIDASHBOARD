CREATE TABLE public.phone_number_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone_number)
);
GRANT SELECT ON public.phone_number_assignments TO authenticated;
GRANT ALL ON public.phone_number_assignments TO service_role;
ALTER TABLE public.phone_number_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own numbers" ON public.phone_number_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all numbers" ON public.phone_number_assignments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  retell_agent_id text NOT NULL,
  agent_name text NOT NULL DEFAULT '',
  from_number text NOT NULL,
  retell_batch_call_id text,
  total_contacts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'launched',
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own campaigns" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all campaigns" ON public.campaigns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX campaigns_user_created_idx ON public.campaigns (user_id, created_at DESC);