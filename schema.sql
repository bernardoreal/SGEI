-- 1. Bases
CREATE TABLE bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_iata VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    supervisor_id UUID REFERENCES users(id),
    coordinator_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users
CREATE TABLE users (
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

-- 4. Base JPA Employees
CREATE TABLE base_jpa (
    bp VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    cargo VARCHAR(100),
    cat_6 BOOLEAN DEFAULT false,
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

-- 5. Schedules
CREATE TABLE schedules (
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
CREATE TABLE schedule_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    bp VARCHAR(20) REFERENCES base_jpa(bp),
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('manhã', 'tarde', 'noite')),
    status VARCHAR(20) CHECK (status IN ('trabalhado', 'folga', 'indisponibilidade')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Schedule Feedback
CREATE TABLE schedule_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    base_id UUID REFERENCES bases(id),
    feedback VARCHAR(10) CHECK (feedback IN ('boa', 'ruim')),
    supervisor_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_schedule_feedback_base_id ON schedule_feedback(base_id);

-- 8. Shift Requests
CREATE TABLE shift_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    requester_bp VARCHAR(20) REFERENCES base_jpa(bp),
    requested_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);

-- 10. Base Configuration
CREATE TABLE base_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_id UUID REFERENCES bases(id),
    min_coverage_per_shift INT NOT NULL,
    min_cat6_per_shift INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. System Settings
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data
INSERT INTO roles (name, description) VALUES 
('admin', 'Administrador Global'),
('manager', 'Gerente Global'),
('coordinator', 'Coordenador Global'),
('supervisor', 'Supervisor de Base'),
('employee', 'Colaborador');

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
('SDU', 'Rio de Janeiro (Santos Dumont)');

-- Seed Admin User (Password should be updated by user)
INSERT INTO users (bp, email, name, roles) 
VALUES ('4598394', 'bernardo.real@latam.com', 'Bernardo de Mendonça Corte Real', ARRAY['admin', 'employee']);

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

-- Users Policies
CREATE POLICY "Allow public BP lookup" ON users
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        (auth.jwt() ->> 'email' = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (
        (auth.jwt() ->> 'email' = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Base JPA Policies (Employees)
CREATE POLICY "Supervisors can manage their base employees" ON base_jpa
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE email = auth.jwt() ->> 'email' 
            AND 'supervisor' = ANY(roles)
        )
    );

CREATE POLICY "Managers and Coordinators can view all employees" ON base_jpa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE email = auth.jwt() ->> 'email' 
            AND (
                'manager' = ANY(roles) OR 
                'coordinator' = ANY(roles) OR 
                'admin' = ANY(roles)
            )
        )
    );

-- Schedules Policies
CREATE POLICY "Employees can view their base schedules" ON schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE email = auth.jwt() ->> 'email' 
            AND (
                base_id = schedules.base_id OR 
                'manager' = ANY(roles) OR 
                'coordinator' = ANY(roles) OR 
                'admin' = ANY(roles)
            )
        )
    );

CREATE POLICY "Supervisors can manage their base schedules" ON schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE email = auth.jwt() ->> 'email' 
            AND 'supervisor' = ANY(roles)
            AND base_id = schedules.base_id
        )
    );

-- Bases Policies
CREATE POLICY "Everyone can view bases" ON bases
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage bases" ON bases
    FOR ALL USING (
        (auth.jwt() ->> 'email' = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Roles Policies
CREATE POLICY "Everyone can view roles" ON roles
    FOR SELECT USING (true);

-- Audit Log Policies
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT USING (
        (auth.jwt() ->> 'email' = 'bernardo.real@latam.com') OR
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Base Configuration Policies
CREATE POLICY "Admins and Managers can view base config" ON base_configuration
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage base config" ON base_configuration
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- System Settings Policies
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view system settings" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email' AND 'admin' = ANY(roles))
    );

-- Initial System Settings
INSERT INTO system_settings (key, value) VALUES 
('llm_config', '{"provider": "gemini", "model": "gemini-3-flash-preview"}'::jsonb);
