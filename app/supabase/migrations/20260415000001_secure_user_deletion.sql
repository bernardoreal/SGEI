-- 1. Stored Procedure for Secure User Deletion
CREATE OR REPLACE FUNCTION delete_user_secure(target_user_id UUID, admin_id UUID)
RETURNS VOID AS $$
DECLARE
  user_bp TEXT;
  user_email TEXT;
  user_name TEXT;
  admin_role TEXT;
  recent_deletions INT;
BEGIN
  -- Check if caller is admin
  SELECT (roles @> ARRAY['admin']) INTO admin_role FROM users WHERE id = admin_id;
  IF admin_role IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem realizar esta ação.';
  END IF;

  -- Rate Limiting: Check recent deletions (last 5 minutes)
  SELECT COUNT(*) INTO recent_deletions
  FROM audit_log
  WHERE action LIKE 'REMOÇÃO EMERGENCIAL%'
  AND created_at >= NOW() - INTERVAL '5 minutes';

  IF recent_deletions >= 3 THEN
    INSERT INTO audit_log (action, table_name) VALUES ('ALERTA: Volume anormal de exclusões detectado', 'users');
    RAISE EXCEPTION 'Limite de exclusões excedido. Operação bloqueada por segurança.';
  END IF;

  -- Get user details
  SELECT bp, email, name INTO user_bp, user_email, user_name FROM users WHERE id = target_user_id;
  IF user_bp IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Add to blacklist
  INSERT INTO blacklist (bp, email, name, reason)
  VALUES (user_bp, user_email, user_name, 'Desligamento emergencial');

  -- Unassign from bases
  UPDATE bases SET supervisor_id = NULL WHERE supervisor_id = target_user_id;
  UPDATE bases SET coordinator_id = NULL WHERE coordinator_id = target_user_id;
  UPDATE bases SET manager_id = NULL WHERE manager_id = target_user_id;

  -- Delete user
  DELETE FROM users WHERE id = target_user_id;

  -- Log action
  INSERT INTO audit_log (action, table_name, record_id)
  VALUES ('REMOÇÃO EMERGENCIAL E BLACKLIST: Usuário ' || user_name || ' deletado e adicionado à blacklist', 'users', target_user_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Immutable Logs Trigger
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Logs de auditoria são imutáveis e não podem ser alterados ou deletados.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_log_modification
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
