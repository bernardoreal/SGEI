-- Tabela de logs de acesso para monitoramento de anomalias
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  base_id UUID REFERENCES bases(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ler logs de acesso
CREATE POLICY "Admins podem ler logs de acesso" ON access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND 'admin' = ANY(users.roles)
    )
  );

-- Política: Usuários podem inserir logs de seu próprio acesso
CREATE POLICY "Usuários podem inserir logs de acesso" ON access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
