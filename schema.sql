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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- 4. Base JPA Employees
CREATE TABLE IF NOT EXISTS base_jpa (
    bp VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    cargo VARCHAR(100),
    cat_6 BOOLEAN DEFAULT false,
    work_regime VARCHAR(20) DEFAULT '5x1',
    work_hours VARCHAR(50), -- New column for custom work hours
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

-- Ensure work_hours column exists if table was created previously
ALTER TABLE base_jpa ADD COLUMN IF NOT EXISTS work_hours VARCHAR(50);

-- 5. Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Schedule Details
CREATE TABLE IF NOT EXISTS schedule_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    bp VARCHAR(20) REFERENCES base_jpa(bp),
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('manhã', 'tarde', 'noite')),
    status VARCHAR(20) CHECK (status IN ('trabalhado', 'folga', 'indisponibilidade')),
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
    requester_bp VARCHAR(20) REFERENCES base_jpa(bp),
    requested_date DATE NOT NULL,
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

-- Seed Bernardo into base_jpa (Operational Table)
INSERT INTO base_jpa (bp, name, email, position, is_active)
VALUES ('4598394', 'Bernardo de Mendonça Corte Real', 'bernardo.real@latam.com', 'Administrador / Colaborador', true)
ON CONFLICT (bp) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    position = EXCLUDED.position;

-- 11. RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_jpa ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_configuration ENABLE ROW LEVEL SECURITY;

-- Security Definer Functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE (id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
    AND 'admin' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE (id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
    AND 'supervisor' = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Policies
DROP POLICY IF EXISTS "Allow public BP lookup" ON users;
CREATE POLICY "Allow public BP lookup" ON users
    FOR SELECT TO anon
    USING (true);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (LOWER(auth.jwt() ->> 'email') = LOWER(email));

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com' OR
        check_is_admin()
    );

DROP POLICY IF EXISTS "Admins can manage users" ON users;
CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (
        LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com' OR
        check_is_admin()
    );

-- Base JPA Policies (Employees)
DROP POLICY IF EXISTS "Admins and Supervisors can manage base employees" ON base_jpa;
CREATE POLICY "Admins and Supervisors can manage base employees" ON base_jpa
    FOR ALL USING (
        check_is_admin() OR check_is_supervisor()
    );

DROP POLICY IF EXISTS "Everyone can view employees" ON base_jpa;
CREATE POLICY "Everyone can view employees" ON base_jpa
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers and Coordinators can view all employees" ON base_jpa;

-- Schedules Policies
DROP POLICY IF EXISTS "Employees can view their base schedules" ON schedules;
CREATE POLICY "Employees can view their base schedules" ON schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') 
            AND (
                base_id = schedules.base_id OR 
                'manager' = ANY(roles) OR 
                'coordinator' = ANY(roles) OR 
                check_is_admin()
            )
        )
    );

DROP POLICY IF EXISTS "Supervisors can manage their base schedules" ON schedules;
CREATE POLICY "Supervisors can manage their base schedules" ON schedules
    FOR ALL USING (
        check_is_supervisor() AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND base_id = schedules.base_id)
    );

-- Bases Policies
DROP POLICY IF EXISTS "Everyone can view bases" ON bases;
CREATE POLICY "Everyone can view bases" ON bases
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage bases" ON bases;
CREATE POLICY "Admins can manage bases" ON bases
    FOR ALL USING (
        (auth.jwt() ->> 'email' = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Roles Policies
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;
CREATE POLICY "Everyone can view roles" ON roles
    FOR SELECT USING (true);

-- Audit Log Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT USING (
        (LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') AND 'admin' = ANY(roles))
    );

-- Base Configuration Policies
DROP POLICY IF EXISTS "Admins and Managers can view base config" ON base_configuration;
CREATE POLICY "Admins and Managers can view base config" ON base_configuration
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage base config" ON base_configuration;
CREATE POLICY "Admins can manage base config" ON base_configuration
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- System Settings Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
CREATE POLICY "Everyone can view system settings" ON system_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        (LOWER(auth.jwt() ->> 'email') = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Initial System Settings
INSERT INTO system_settings (key, value) VALUES 
('llm_config', '{"provider": "gemini", "model": "gemini-3-flash-preview"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
