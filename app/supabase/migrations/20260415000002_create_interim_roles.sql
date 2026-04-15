-- Tabela de atribuições de roles interinas
CREATE TABLE IF NOT EXISTS interim_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assigner_id UUID REFERENCES auth.users(id) NOT NULL, -- Quem está saindo de férias
  assignee_id UUID REFERENCES auth.users(id) NOT NULL, -- Quem está assumindo
  role_type TEXT NOT NULL CHECK (role_type IN ('gerente', 'coordenador', 'supervisor')),
  base_id UUID REFERENCES bases(id), -- Opcional, para supervisor
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Habilitar RLS
ALTER TABLE interim_roles ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem gerenciar todas as atribuições
CREATE POLICY "Admins podem gerenciar atribuições" ON interim_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- Política: Usuários podem ver atribuições que os afetam
CREATE POLICY "Usuários podem ver suas atribuições" ON interim_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assigner_id OR auth.uid() = assignee_id
  );
