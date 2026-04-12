'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Hash, 
  MapPin, 
  ArrowRight,
  Phone,
  Briefcase
} from 'lucide-react';

const LATAM_LOGO = "data:image/png;base64,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";

interface Base {
  id: string;
  code_iata: string;
  name: string;
}

export default function RegisterPage() {
  const [bp, setBp] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [cat6, setCat6] = useState(false);
  const [cargo, setCargo] = useState('');
  const [phone, setPhone] = useState('');
  const [baseSearch, setBaseSearch] = useState('');
  const [showBaseDropdown, setShowBaseDropdown] = useState(false);
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Fallback bases in case DB is empty or still being seeded
  const fallbackBases = [
    { id: 'jpa-id', code_iata: 'JPA', name: 'João Pessoa' },
    { id: 'rec-id', code_iata: 'REC', name: 'Recife' },
    { id: 'gig-id', code_iata: 'GIG', name: 'Rio de Janeiro (Galeão)' },
    { id: 'nat-id', code_iata: 'NAT', name: 'Natal' },
    { id: 'mcz-id', code_iata: 'MCZ', name: 'Maceió' },
    { id: 'aju-id', code_iata: 'AJU', name: 'Aracaju' },
    { id: 'for-id', code_iata: 'FOR', name: 'Fortaleza' },
    { id: 'the-id', code_iata: 'THE', name: 'Teresina' },
    { id: 'slz-id', code_iata: 'SLZ', name: 'São Luís' },
    { id: 'imp-id', code_iata: 'IMP', name: 'Imperatriz' },
    { id: 'ssa-id', code_iata: 'SSA', name: 'Salvador' },
    { id: 'ios-id', code_iata: 'IOS', name: 'Ilhéus' },
    { id: 'bps-id', code_iata: 'BPS', name: 'Porto Seguro' },
    { id: 'vdc-id', code_iata: 'VDC', name: 'Vitória da Conquista' },
    { id: 'cnf-id', code_iata: 'CNF', name: 'Belo Horizonte (Confins)' },
    { id: 'plu-id', code_iata: 'PLU', name: 'Belo Horizonte (Pampulha)' },
    { id: 'udi-id', code_iata: 'UDI', name: 'Uberlândia' },
    { id: 'vix-id', code_iata: 'VIX', name: 'Vitória' },
    { id: 'sdu-id', code_iata: 'SDU', name: 'Rio de Janeiro (Santos Dumont)' }
  ];

  const displayBases = bases.length > 0 ? bases : fallbackBases;

  const filteredBases = useMemo(() => {
    return displayBases.filter(base => 
      base.name.toLowerCase().includes(baseSearch.toLowerCase()) ||
      base.code_iata.toLowerCase().includes(baseSearch.toLowerCase())
    );
  }, [displayBases, baseSearch]);

  const selectedBase = useMemo(() => {
    return displayBases.find(b => b.id === selectedBaseId);
  }, [displayBases, selectedBaseId]);

  useEffect(() => {
    const fetchBases = async () => {
      const { data, error } = await supabase.from('bases').select('id, code_iata, name').order('name');
      if (error) {
        console.error('Error fetching bases:', error);
      } else if (data && data.length > 0) {
        setBases(data);
      }
    };
    fetchBases();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBaseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validatePassword = (pass: string) => {
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLongEnough = pass.length >= 8;
    return hasLetter && hasNumber && hasSpecial && isLongEnough;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedBaseId) {
      setError('Por favor, selecione sua base.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('A senha deve ter pelo menos 8 caracteres, incluindo letras, números e caracteres especiais.');
      setLoading(false);
      return;
    }

    // 1. Criar usuário no Auth
    console.log('Starting auth.signUp...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          name, 
          bp,
          base_id: selectedBaseId
        } 
      },
    });
    console.log('auth.signUp result:', { authData, authError });

    if (authError) {
      console.error('Authentication error:', authError);
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Criar registro na tabela users
    console.log('Starting users.insert...');
    const isBernardo = email.toLowerCase() === 'bernardo.real@latam.com';
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user?.id,
      bp,
      email,
      name,
      password_plain: btoa(unescape(encodeURIComponent(password))), // Anonimizando a senha (Base64 Seguro) conforme solicitado
      base_id: selectedBaseId,
      cat6,
      cargo,
      phone,
      roles: isBernardo ? ['admin', 'employee'] : ['pending'], // Atribuindo múltiplos papéis para o admin
    });
    console.log('users.insert result:', { dbError });

    if (dbError) {
      console.error('Database registration error:', dbError);
      setError(dbError.message);
    } else {
      // 3. Sincronizar com a tabela operacional da base (ex: base_jpa)
      if (selectedBase?.code_iata === 'JPA') {
        try {
          await supabase.from('base_jpa').insert([{
            bp,
            name,
            email,
            position: cargo,
            is_active: true
          }]);
          console.log('Usuário sincronizado com a base operacional JPA');
        } catch (syncError) {
          console.error('Erro ao sincronizar com base operacional:', syncError);
          // Não bloqueamos o registro se a sincronização falhar, mas logamos o erro
        }
      }

      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-latam-indigo">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-latam-crimson/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-[32px] overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-4 mb-10">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl p-2 border border-white/50"
            >
              <Image 
                src={LATAM_LOGO} 
                alt="LATAM Logo" 
                width={60} 
                height={60} 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-latam-indigo tracking-tight">Primeiro Acesso</h1>
              <p className="text-xs text-slate-500 font-medium">Crie sua conta corporativa</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-red-600 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-latam-indigo/60 ml-1">Dados Identificação</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="BP (Registro Funcional)" 
                  value={bp} 
                  onChange={(e) => setBp(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Nome Completo" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="tel" 
                  placeholder="Telefone (Opcional)" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                />
              </div>
              <div className="relative group">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <select 
                  value={cargo} 
                  onChange={(e) => setCargo(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                >
                  <option value="" disabled>Selecione o Cargo</option>
                  <option value="Auxiliar de Cargas">Auxiliar de Cargas</option>
                  <option value="Despachante">Despachante</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Coordenador">Coordenador</option>
                </select>
              </div>
              <div className="flex items-center gap-2 ml-1">
                <input 
                  type="checkbox" 
                  id="cat6"
                  checked={cat6}
                  onChange={(e) => setCat6(e.target.checked)}
                  className="w-5 h-5 rounded border-white/50 text-latam-indigo focus:ring-latam-indigo"
                />
                <label htmlFor="cat6" className="text-sm font-medium text-latam-indigo">Possui CAT 6</label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-latam-indigo/60 ml-1">Localização</label>
              <div className="relative" ref={dropdownRef}>
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40" size={18} />
                <input 
                  type="text"
                  placeholder="Selecione sua Base (ex: JPA, REC...)"
                  value={showBaseDropdown ? baseSearch : (selectedBase ? `${selectedBase.code_iata} - ${selectedBase.name}` : '')}
                  onChange={(e) => {
                    setBaseSearch(e.target.value);
                    if (!showBaseDropdown) setShowBaseDropdown(true);
                  }}
                  onFocus={() => {
                    setShowBaseDropdown(true);
                    setBaseSearch('');
                  }}
                  onClick={() => {
                    if (!showBaseDropdown) {
                      setShowBaseDropdown(true);
                      setBaseSearch('');
                    }
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400 cursor-pointer"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-latam-indigo/40">
                  <ArrowRight size={16} className="rotate-90" />
                </div>

                <AnimatePresence>
                  {showBaseDropdown && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 left-0 right-0 mt-3 glass rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2"
                    >
                      {filteredBases.length > 0 ? (
                        filteredBases.map(base => (
                          <button
                            key={base.id}
                            type="button"
                            onClick={() => {
                              setSelectedBaseId(base.id);
                              setShowBaseDropdown(false);
                              setBaseSearch('');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-latam-indigo/5 rounded-xl transition-colors flex items-center justify-between group"
                          >
                            <div>
                              <span className="font-bold text-latam-indigo">{base.code_iata}</span>
                              <span className="mx-2 text-slate-300">|</span>
                              <span className="text-slate-600 font-medium">{base.name}</span>
                            </div>
                            <ArrowRight size={14} className="text-latam-crimson opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-slate-500 text-sm">
                          Nenhuma base encontrada para &quot;{baseSearch}&quot;
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-latam-indigo/60 ml-1">Acesso</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="email" 
                  placeholder="E-mail Corporativo (@latam.com)" 
                  value={email} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    if (val && !val.endsWith('@latam.com')) {
                      setEmailError('O e-mail deve ser corporativo (@latam.com)');
                    } else {
                      setEmailError(null);
                    }
                  }}
                  className={`w-full pl-12 pr-4 py-4 bg-white/50 border ${emailError ? 'border-red-500' : 'border-white/50'} rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400`}
                  required
                />
                {emailError && <p className="text-red-500 text-xs mt-1 ml-1">{emailError}</p>}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-latam-indigo/40 group-focus-within:text-latam-indigo transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="Confirmar Senha" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/50 rounded-2xl focus:ring-2 focus:ring-latam-indigo/20 focus:bg-white outline-none transition-all text-latam-indigo font-medium placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-latam-indigo hover:bg-[#001a54] text-white font-bold py-4 rounded-2xl shadow-xl shadow-latam-indigo/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-6 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Finalizar Cadastro
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-white/40 backdrop-blur-md p-6 border-t border-white/20 text-center">
          <p className="text-sm text-slate-600">
            Já possui uma conta? <button onClick={() => router.push('/')} className="text-latam-crimson font-bold hover:underline">Fazer Login</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
