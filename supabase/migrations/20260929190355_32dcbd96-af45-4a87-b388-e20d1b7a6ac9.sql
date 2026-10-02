CREATE TABLE public.client_billing (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rate_per_minute numeric(10,4),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_billing TO authenticated;
GRANT ALL ON public.client_billing TO service_role;
ALTER TABLE public.client_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage billing" ON public.client_billing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.workspace_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_spend_limit numeric(10,2),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage settings" ON public.workspace_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.workspace_settings (id) VALUES (1);