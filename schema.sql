-- 1. Bases
CREATE TABLE IF NOT EXISTS bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_iata VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE bases ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE bases ADD COLUMN IF NOT EXISTS coordinator_id UUID;
ALTER TABLE bases ADD COLUMN IF NOT EXISTS manager_id UUID;

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[a-z]+\.[a-z]+@latam\.com$'),
    name VARCHAR(255) NOT NULL,
    password_plain TEXT, -- Not recommended for production, but added per request
    roles TEXT[] DEFAULT ARRAY['pending'], -- Alterado para suportar múltiplos papéis
    base_id UUID REFERENCES bases(id),
    cat6 BOOLEAN DEFAULT false,
    cargo VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was created previously
ALTER TABLE users ADD COLUMN IF NOT EXISTS cat6 BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Ensure password_plain can be NULL if it was created as NOT NULL previously
ALTER TABLE users ALTER COLUMN password_plain DROP NOT NULL;

-- Add foreign keys to bases after users table exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bases_supervisor_id_fkey') THEN
        ALTER TABLE bases ADD CONSTRAINT bases_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bases_coordinator_id_fkey') THEN
        ALTER TABLE bases ADD CONSTRAINT bases_coordinator_id_fkey FOREIGN KEY (coordinator_id) REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bases_manager_id_fkey') THEN
        ALTER TABLE bases ADD CONSTRAINT bases_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users(id);
    END IF;
END $$;

-- 4. Base Employees (Generic)
CREATE TABLE IF NOT EXISTS base_employees (
    bp VARCHAR(20) PRIMARY KEY,
    base_id UUID REFERENCES bases(id),
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    cargo VARCHAR(100),
    cat_6 BOOLEAN DEFAULT false,
    work_regime VARCHAR(20) DEFAULT '5x1',
    work_hours VARCHAR(50),
    fixed_days_off TEXT,
    hour_compensation VARCHAR(20) DEFAULT '0h',
    vacation_period TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    date_of_birth DATE,
    admission_date DATE,
    operational_restrictions TEXT,
    certifications TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migração se a tabela antiga existir
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'base_jpa') THEN
        -- Copiar dados se necessário ou apenas renomear
        -- Para simplificar neste ambiente, vamos apenas renomear se possível ou assumir a nova
        ALTER TABLE base_jpa RENAME TO base_employees;
    END IF;
END $$;

-- 5. Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    content TEXT, -- Armazena o rascunho em Markdown ou JSON
    status VARCHAR(20) DEFAULT 'rascunho', -- rascunho, publicado, arquivado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was created previously
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'rascunho';

-- 5.1 Escala Drafts (Specific table for AI drafts if needed)
CREATE TABLE IF NOT EXISTS escala_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    content JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE escala_drafts ENABLE ROW LEVEL SECURITY;

-- 6. Schedule Details
CREATE TABLE IF NOT EXISTS schedule_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    bp VARCHAR(20) REFERENCES base_employees(bp),
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('manhã', 'tarde', 'noite')),
    status VARCHAR(20) CHECK (status IN ('trabalhado', 'folga', 'indisponibilidade')),
    code VARCHAR(10), -- New column to store exact shift/off code (e.g., T079, FAGR)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Schedule Feedback
CREATE TABLE IF NOT EXISTS schedule_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    base_id UUID REFERENCES bases(id),
    feedback VARCHAR(10) CHECK (feedback IN ('boa', 'ruim')),
    supervisor_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedule_feedback_base_id ON schedule_feedback(base_id);

-- 8. Shift Requests
CREATE TABLE IF NOT EXISTS shift_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    requester_bp VARCHAR(20) REFERENCES base_employees(bp),
    requested_date DATE NOT NULL,
    requested_shift VARCHAR(50),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);

-- 10. Base Configuration
CREATE TABLE IF NOT EXISTS base_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    min_coverage_per_shift INT NOT NULL,
    min_cat6_per_shift INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. AI Usage Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. System Suggestions
CREATE TABLE IF NOT EXISTS system_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_name TEXT,
    user_role TEXT,
    suggestion TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('baixa', 'média', 'alta', 'crítica')),
    category TEXT DEFAULT 'Outros',
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'implementado', 'arquivado', 'finalizado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE system_suggestions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Outros';

-- Seed Data
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrador Global'),
('manager', 'Gerente Global'),
('coordinator', 'Coordenador Global'),
('supervisor', 'Supervisor de Base'),
('employee', 'Colaborador')
ON CONFLICT (name) DO NOTHING;

INSERT INTO bases (code_iata, name) VALUES 
('JPA', 'João Pessoa'),
('REC', 'Recife'),
('GIG', 'Rio de Janeiro (Galeão)'),
('NAT', 'Natal'),
('MCZ', 'Maceió'),
('AJU', 'Aracaju'),
('FOR', 'Fortaleza'),
('THE', 'Teresina'),
('SLZ', 'São Luís'),
('IMP', 'Imperatriz'),
('SSA', 'Salvador'),
('IOS', 'Ilhéus'),
('BPS', 'Porto Seguro'),
('VDC', 'Vitória da Conquista'),
('CNF', 'Belo Horizonte (Confins)'),
('PLU', 'Belo Horizonte (Pampulha)'),
('UDI', 'Uberlândia'),
('VIX', 'Vitória'),
('SDU', 'Rio de Janeiro (Santos Dumont)')
ON CONFLICT (code_iata) DO NOTHING;

-- Seed Admin User (Password should be updated by user)
INSERT INTO users (bp, email, name, roles, base_id) 
VALUES (
    '4598394', 
    'bernardo.real@latam.com', 
    'Bernardo de Mendonça Corte Real', 
    ARRAY['admin', 'employee'],
    (SELECT id FROM bases WHERE code_iata = 'JPA' LIMIT 1)
)
ON CONFLICT (email) DO UPDATE SET 
    roles = ARRAY['admin', 'employee'],
    base_id = (SELECT id FROM bases WHERE code_iata = 'JPA' LIMIT 1);

-- Seed Bernardo into base_employees (Operational Table)
INSERT INTO base_employees (bp, name, email, position, is_active, base_id)
VALUES ('4598394', 'Bernardo de Mendonça Corte Real', 'bernardo.real@latam.com', 'Administrador / Colaborador', true, (SELECT id FROM bases WHERE code_iata = 'JPA' LIMIT 1))
ON CONFLICT (bp) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    position = EXCLUDED.position,
    base_id = EXCLUDED.base_id;

-- 11. RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_suggestions ENABLE ROW LEVEL SECURITY;

-- Security Definer Functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_email(email_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) = LOWER(email_to_check)
    OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email = LOWER(email_to_check)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct query that bypasses RLS because of SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND 'admin' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global Super Admin Override (Uses roles, not email)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "SuperAdmin full access" ON %I', t);
        EXECUTE format('CREATE POLICY "SuperAdmin full access" ON %I FOR ALL USING (public.check_is_admin())', t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.check_is_supervisor()
RETURNS BOOLEAN AS $$
DECLARE
  is_supervisor_user BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND 'supervisor' = ANY(roles)
  ) INTO is_supervisor_user;
  
  RETURN COALESCE(is_supervisor_user, false) OR public.check_is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_coordinator()
RETURNS BOOLEAN AS $$
DECLARE
  is_coord BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND ('coordinator' = ANY(roles) OR 'manager' = ANY(roles) OR 'admin' = ANY(roles))
  ) INTO is_coord;
  
  RETURN COALESCE(is_coord, false) OR public.check_is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Policies
DROP POLICY IF EXISTS "Allow public BP lookup" ON users;
CREATE POLICY "Allow public BP lookup" ON users
    FOR SELECT TO anon
    USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (check_is_admin());

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (check_is_admin());

-- Base Employees Policies
DROP POLICY IF EXISTS "Admins and Supervisors can manage base employees" ON base_employees;
CREATE POLICY "Admins and Supervisors can manage base employees" ON base_employees
    FOR ALL USING (
        check_is_admin() OR 
        (check_is_supervisor() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = base_employees.base_id))
    );

DROP POLICY IF EXISTS "Everyone can view employees" ON base_employees;
CREATE POLICY "Everyone can view employees" ON base_employees
    FOR SELECT USING (
        check_is_coordinator() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = base_employees.base_id)
    );

-- Shift Requests Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON shift_requests;
CREATE POLICY "Users can view their own requests" ON shift_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (bp = shift_requests.requester_bp OR base_id = shift_requests.base_id)) OR
        check_is_coordinator()
    );

DROP POLICY IF EXISTS "Supervisors can manage base requests" ON shift_requests;
CREATE POLICY "Supervisors can manage base requests" ON shift_requests
    FOR ALL USING (
        check_is_admin() OR
        (check_is_supervisor() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = shift_requests.base_id))
    );

-- Schedules Policies
DROP POLICY IF EXISTS "Employees can view their base schedules" ON schedules;
CREATE POLICY "Employees can view their base schedules" ON schedules
    FOR SELECT USING (
        check_is_admin() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()
            AND (
                base_id = schedules.base_id OR 
                'manager' = ANY(roles) OR 
                'coordinator' = ANY(roles)
            )
        )
    );

DROP POLICY IF EXISTS "Supervisors can manage their base schedules" ON schedules;
CREATE POLICY "Supervisors can manage their base schedules" ON schedules
    FOR ALL USING (
        check_is_supervisor() AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = schedules.base_id)
    );

-- Escala Drafts Policies
DROP POLICY IF EXISTS "Supervisors can manage their base drafts" ON escala_drafts;
CREATE POLICY "Supervisors can manage their base drafts" ON escala_drafts
    FOR ALL USING (
        check_is_supervisor() AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = escala_drafts.base_id)
    );

DROP POLICY IF EXISTS "Admins can view all drafts" ON escala_drafts;
CREATE POLICY "Admins can view all drafts" ON escala_drafts
    FOR SELECT USING (check_is_admin());

-- Bases Policies
DROP POLICY IF EXISTS "Everyone can view bases" ON bases;
CREATE POLICY "Everyone can view bases" ON bases
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage bases" ON bases;
CREATE POLICY "Admins can manage bases" ON bases
    FOR ALL USING (check_is_admin());

-- Roles Policies
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;
CREATE POLICY "Everyone can view roles" ON roles
    FOR SELECT USING (true);

-- Audit Log Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT USING (check_is_admin());

-- Base Configuration Policies
DROP POLICY IF EXISTS "Admins and Managers can view base config" ON base_configuration;
CREATE POLICY "Admins and Managers can view base config" ON base_configuration
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Supervisors can manage base config" ON base_configuration;
CREATE POLICY "Admins and Supervisors can manage base config" ON base_configuration
    FOR ALL USING (
        check_is_admin() OR
        (check_is_supervisor() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = base_configuration.base_id))
    );

-- System Suggestions Policies
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON system_suggestions;
CREATE POLICY "Users can insert their own suggestions" ON system_suggestions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all suggestions" ON system_suggestions;
CREATE POLICY "Admins can view all suggestions" ON system_suggestions
    FOR SELECT USING (check_is_admin() OR LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com');

DROP POLICY IF EXISTS "Users can view their own suggestions" ON system_suggestions;
CREATE POLICY "Users can view their own suggestions" ON system_suggestions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins and Supervisors can manage base config" ON base_configuration
    FOR ALL USING (
        check_is_admin() OR check_is_supervisor()
    );

-- System Settings Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
CREATE POLICY "Everyone can view system settings" ON system_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        check_is_admin() OR
        LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com'
    );

-- Function to sync roles to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_metadata_data = 
        jsonb_set(
            COALESCE(raw_app_metadata_data, '{}'::jsonb),
            '{roles}',
            to_jsonb(NEW.roles)
        )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure Bernardo's Seed always keeps 'admin'
CREATE OR REPLACE FUNCTION public.ensure_super_admin_role()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user being modified is Bernardo, forcefully inject 'admin' into roles array
    IF LOWER(NEW.email) = 'bernardo.real@latam.com' THEN
        IF NEW.roles IS NULL OR NOT ('admin' = ANY(NEW.roles)) THEN
            NEW.roles := array_append(COALESCE(NEW.roles, ARRAY[]::text[]), 'admin');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_super_admin ON public.users;
CREATE TRIGGER ensure_super_admin
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_super_admin_role();

-- ==========================================
-- WORM (Write Once, Read Many) Audit Log
-- ==========================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log is immutable. Modifications or deletions are strictly prohibited by system security constraints.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_audit_log_update ON audit_log;
CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_delete ON audit_log;
CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_log_truncate ON audit_log;
CREATE TRIGGER prevent_audit_log_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ==========================================
-- SOC Offensive Alerts Trigger
-- ==========================================
CREATE OR REPLACE FUNCTION public.check_security_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    recent_critical_count INT;
BEGIN
    IF NEW.action IN ('UNAUTHORIZED_ACCESS_ATTEMPT', 'FORBIDDEN', 'ATTACK') THEN
        -- Check how many similar critical hits in the last 10 minutes
        SELECT COUNT(*) INTO recent_critical_count
        FROM audit_log
        WHERE action = NEW.action AND created_at > (NOW() - INTERVAL '10 minutes');

        IF recent_critical_count >= 3 THEN
            -- Fire a pg_notify payload that could be caught by edge functions/webhooks to Slack/Email
            PERFORM pg_notify(
                'soc_alerts', 
                json_build_object(
                    'level', 'EMERGENCY', 
                    'message', 'Multiplas tentativas de invasao detectadas.', 
                    'action', NEW.action,
                    'timestamp', NOW()
                )::text
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_soc_alerts ON audit_log;
CREATE TRIGGER trigger_soc_alerts
AFTER INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION public.check_security_thresholds();

-- Trigger to sync on insert or update
DROP TRIGGER IF EXISTS on_user_roles_change ON public.users;
CREATE TRIGGER on_user_roles_change
    AFTER INSERT OR UPDATE OF roles ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_roles_to_metadata();

-- One-time sync for existing users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, roles FROM public.users
    LOOP
        UPDATE auth.users
        SET raw_app_metadata_data = 
            jsonb_set(
                COALESCE(raw_app_metadata_data, '{}'::jsonb),
                '{roles}',
                to_jsonb(user_record.roles)
            )
        WHERE id = user_record.id;
    END LOOP;
END $$;

