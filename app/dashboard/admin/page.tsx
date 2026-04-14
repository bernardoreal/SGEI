'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getOpenRouterKeyInfo } from '@/app/actions/ai';
import { 
  Users, 
  UserPlus, 
  Database, 
  Activity, 
  Filter, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle,
  CheckCircle2,
  Clock,
  Search,
  ArrowUpRight,
  X,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Cpu,
  Settings,
  Bell,
  Eye,
  ChevronDown,
  Briefcase,
  Map as MapIcon,
  ClipboardList,
  User as UserIcon,
  Trash2,
  GripVertical,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateWithGemini } from '@/app/actions/ai';

// Import other dashboards for preview
import ManagerDashboard from '../manager/page';
import CoordinatorDashboard from '../coordinator/page';
import SupervisorDashboard from '../supervisor/page';
import EmployeeDashboard from '../employee/page';

interface User {
  id: string;
  bp: string;
  name: string;
  email: string;
  roles: string[];
  base_id: string | null;
  created_at: string;
}

interface Base {
  id: string;
  code_iata: string;
  name: string;
  supervisor_id: string | null;
  coordinator_id: string | null;
  manager_id: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  created_at: string;
  user_id: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBase, setSelectedBase] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState<'create' | 'delete'>('create');
  const [deleteSearchQuery, setDeleteSearchQuery] = useState('');
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<string | null>(null);
  const [selectedBaseIdForModal, setSelectedBaseIdForModal] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null);
  const [updatingBaseId, setUpdatingBaseId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-3-flash-preview' });
  const [savingLlm, setSavingLlm] = useState(false);
  const [openRouterInfo, setOpenRouterInfo] = useState<any>(null);
  const [tokenStats, setTokenStats] = useState({ prompt: 0, completion: 0, total: 0 });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pendingSuggestions = useMemo(() => 
    suggestions.filter(s => s.status === 'pendente' || !s.status),
    [suggestions]
  );

  const finalizedHistory = useMemo(() => 
    suggestions
      .filter(s => s.status === 'finalizado' || s.status === 'implementado')
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()),
    [suggestions]
  );

  const analyzeSuggestions = useCallback(async () => {
    if (pendingSuggestions.length === 0) {
      setAnalysis(null);
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = `
        Analise as seguintes solicitações de melhoria pendentes para o sistema SGEI (Sistema de Gestão de Escalas Inteligente) da LATAM Cargo:
        
        ${pendingSuggestions.map((s, i) => `${i+1}. [Prioridade: ${s.priority}] ${s.suggestion}`).join('\n')}
        
        Sua análise deve cobrir:
        1. Aspectos técnicos (o que precisa ser alterado no código/banco).
        2. Viabilidade e dificuldade de implementação (Baixa, Média, Alta).
        3. Ordem sugerida para implementação com justificativa clara para cada uma.
        
        Responda em Markdown, de forma profissional e executiva. Use tabelas se necessário.
      `;

      const result = await generateWithGemini(prompt, llmConfig.model);
      setAnalysis(result);
    } catch (err) {
      console.error('Erro na análise de IA:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [pendingSuggestions, llmConfig.model]);

  useEffect(() => {
    if (pendingSuggestions.length > 0) {
      analyzeSuggestions();
    } else {
      setAnalysis(null);
    }
  }, [pendingSuggestions.length, analyzeSuggestions]);
  const [geminiDailyRequests, setGeminiDailyRequests] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);
  const [viewMode, setViewMode] = useState<'admin' | 'manager' | 'coordinator' | 'supervisor' | 'employee'>('admin');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('users-insert')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload: any) => {
        const newUser = payload.new as any;
        const notification = { id: Date.now().toString(), message: `Novo usuário cadastrado: ${newUser.name || newUser.email}` };
        setNotifications(prev => [...prev, notification]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const [newUserForm, setNewUserForm] = useState({
    bp: '',
    name: '',
    email: '',
    password: '',
    role: 'pending',
    base_id: ''
  });
  
  // Simulação de armazenamento (Supabase Free Tier: 500MB)
  const [storageUsed, setStorageUsed] = useState(185); // MB
  const storageLimit = 500;

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          window.location.href = '/';
          return;
        } else {
          console.error('Session error:', sessionError);
        }
      }

      if (session?.user) {
        setCurrentUser(session.user);
        console.log('User email from session:', session.user.email);
      }

      console.log('Fetching admin data...');
      const [usersRes, basesRes, logsRes, rolesRes, llmRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('bases').select('*').order('code_iata'),
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('roles').select('name'),
        supabase.from('system_settings').select('value').eq('key', 'llm_config').maybeSingle()
      ]);

      if (usersRes.error) {
        console.error('Error fetching users:', usersRes.error);
        setNotifications(prev => [...prev, { 
          id: 'fetch-error-' + Date.now(), 
          message: `Erro ao carregar usuários: ${usersRes.error.message}. Verifique as políticas de RLS.` 
        }]);
      }

      console.log('Users fetch result:', { 
        count: usersRes.data?.length || 0, 
        error: usersRes.error,
        status: usersRes.status
      });

      if (llmRes.data) {
        setLlmConfig(llmRes.data.value);
      }

      // Buscar estatísticas de tokens
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const { data: usageData } = await supabase
          .from('ai_usage_logs')
          .select('prompt_tokens, completion_tokens, total_tokens, provider, created_at');
        
        if (usageData) {
          const stats = usageData.reduce((acc: any, curr: any) => ({
            prompt: acc.prompt + (curr.prompt_tokens || 0),
            completion: acc.completion + (curr.completion_tokens || 0),
            total: acc.total + (curr.total_tokens || 0)
          }), { prompt: 0, completion: 0, total: 0 });
          setTokenStats(stats);

          // Count Gemini requests today
          const geminiToday = usageData.filter((log: any) => 
            log.provider === 'gemini' && new Date(log.created_at) >= today
          ).length;
          setGeminiDailyRequests(geminiToday);
        }
      } catch (err) {
        console.error('Error fetching token stats:', err);
      }

      const orInfo = await getOpenRouterKeyInfo();
      setOpenRouterInfo(orInfo);

      // Ensure admin_employee role exists
      if (rolesRes.data && !rolesRes.data.find((r: any) => r.name === 'admin_employee')) {
        await supabase.from('roles').insert([{ name: 'admin_employee', description: 'Admin com função de Colaborador (Híbrido)' }]);
      }

      if (usersRes.data) {
        console.log('Setting users state:', usersRes.data);
        setUsers([...usersRes.data]);
      }
      if (basesRes.data) {
        console.log('Setting bases state:', basesRes.data);
        setBases([...basesRes.data]);
      }
      if (logsRes.data) setLogs(logsRes.data);

      // Fetch Suggestions
      const { data: suggestionsData } = await supabase
        .from('system_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      setSuggestions(suggestionsData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesBase = selectedBase === 'all' || user.base_id === selectedBase;
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBase && matchesSearch;
    });
  }, [users, selectedBase, searchTerm]);

  const stats = useMemo(() => {
    const total = users.length;
    const activeBases = bases.length;
    
    const roleCounts = users.reduce((acc: any, user: any) => {
      const userRoles = user.roles || [];
      if (userRoles.length === 0 || (userRoles.length === 1 && userRoles[0] === 'pending')) {
        acc['pending'] = (acc['pending'] || 0) + 1;
      } else {
        userRoles.forEach((role: any) => {
          acc[role] = (acc[role] || 0) + 1;
        });
      }
      return acc;
    }, {});
    
    return { total, activeBases, roleCounts };
  }, [users, bases]);

  const usersInSelectedRole = useMemo(() => {
    if (!selectedRoleForModal) return [];
    return users.filter(u => {
      const userRoles = u.roles || [];
      if (selectedRoleForModal === 'pending') {
        return userRoles.length === 0 || (userRoles.length === 1 && userRoles[0] === 'pending');
      }
      return userRoles.includes(selectedRoleForModal);
    });
  }, [users, selectedRoleForModal]);

  const baseStats = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};
    bases.forEach(base => {
      stats[base.id] = {
        employee: 0,
        supervisor: 0,
        coordinator: 0,
        manager: 0,
        admin: 0,
        pending: 0
      };
    });

    users.forEach(user => {
      if (user.base_id && stats[user.base_id]) {
        const userRoles = user.roles || [];
        const baseId = user.base_id;
        if (userRoles.length === 0 || (userRoles.length === 1 && userRoles[0] === 'pending')) {
          stats[baseId]['pending'] = (stats[baseId]['pending'] || 0) + 1;
        } else {
          userRoles.forEach(role => {
            if (stats[baseId] && stats[baseId][role] !== undefined) {
              stats[baseId][role] = (stats[baseId][role] || 0) + 1;
            }
          });
        }
      }
    });

    return stats;
  }, [users, bases]);

  const usersInSelectedBase = useMemo(() => {
    if (!selectedBaseIdForModal) return [];
    return users.filter(u => u.base_id === selectedBaseIdForModal);
  }, [users, selectedBaseIdForModal]);

  const filteredUsersForDeletion = useMemo(() => {
    if (!deleteSearchQuery) return [];
    return users.filter(u => 
      u.name.toLowerCase().includes(deleteSearchQuery.toLowerCase()) || 
      u.bp.includes(deleteSearchQuery)
    );
  }, [users, deleteSearchQuery]);

  const [selectedUserForBase, setSelectedUserForBase] = useState<User | null>(null);

  const handleAssignRole = async (userId: string, role: string) => {
    setUpdatingUserId(userId);
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      let newRoles: string[];
      const currentRoles = user.roles || [];

      if (role === 'pending') {
        newRoles = ['pending'];
      } else {
        // Remove 'pending' if adding a real role
        const filteredRoles = currentRoles.filter(r => r !== 'pending');
        
        if (filteredRoles.includes(role)) {
          // Toggle off
          newRoles = filteredRoles.filter(r => r !== role);
          if (newRoles.length === 0) newRoles = ['pending'];
        } else {
          // Toggle on
          newRoles = [...filteredRoles, role];
        }
      }

      const { error } = await supabase
        .from('users')
        .update({ roles: newRoles })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: newRoles } : u));
      
      // If adding 'employee' to a privileged user, suggest operational sync
      if (!currentRoles.includes('employee') && newRoles.includes('employee') && newRoles.some(r => ['admin', 'manager', 'coordinator', 'supervisor'].includes(r))) {
        const confirmSync = confirm(`Você adicionou a função de Colaborador a um usuário com privilégios. Deseja sincronizá-lo agora com a base operacional para que ele apareça nas escalas?`);
        if (confirmSync) {
          const updatedUser = { ...user, roles: newRoles };
          handleSyncToOperational(updatedUser);
        }
      }

      await supabase.from('audit_log').insert({
        action: `Alteração de roles para: ${newRoles.join(', ')}`,
        table_name: 'users',
        record_id: userId as any
      });

    } catch (error) {
      console.error('Error assigning role:', error);
      alert('Erro ao atribuir role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleAssignBase = async (userId: string, baseId: string | null) => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ base_id: baseId })
        .eq('id', userId);

      if (error) throw error;
      
      const updatedUser = users.find(u => u.id === userId);
      if (updatedUser && baseId) {
        const userWithNewBase = { ...updatedUser, base_id: baseId };
        setUsers(prev => prev.map(u => u.id === userId ? userWithNewBase : u));
        // Sincronizar automaticamente com a base operacional
        await handleSyncToOperational(userWithNewBase);
      } else {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, base_id: baseId } : u));
      }
      
      await supabase.from('audit_log').insert({
        action: `Atribuição de base: ${baseId || 'Nenhuma'}`,
        table_name: 'users',
        record_id: userId as any
      });

    } catch (error) {
      console.error('Error assigning base:', error);
      alert('Erro ao atribuir base.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateBaseAssignment = async (baseId: string, roleField: string, userId: string | null) => {
    setUpdatingBaseId(baseId);
    try {
      const { error } = await supabase
        .from('bases')
        .update({ [roleField]: userId })
        .eq('id', baseId);

      if (error) throw error;

      setBases(prev => prev.map(b => b.id === baseId ? { ...b, [roleField]: userId } : b));

      await supabase.from('audit_log').insert({
        action: `Atribuição de ${roleField} na base ${baseId}`,
        table_name: 'bases',
        record_id: baseId as any
      });

    } catch (error) {
      console.error('Error updating base assignment:', error);
      alert('Erro ao atualizar atribuição da base.');
    } finally {
      setUpdatingBaseId(null);
    }
  };

  const handleSyncToOperational = async (user: User) => {
    if (!user.base_id) {
      alert('O usuário precisa estar vinculado a uma base primeiro.');
      return;
    }

    const base = bases.find(b => b.id === user.base_id);
    if (!base) return;

    // For now, we only have base_employees table as per schema.sql
    if (base.code_iata !== 'JPA') {
      alert(`A base ${base.code_iata} ainda não possui tabela operacional configurada.`);
      return;
    }

    setSyncingUserId(user.id);
    try {
      // Check if already exists in base_employees
      const { data: existing } = await supabase
        .from('base_employees')
        .select('bp')
        .eq('bp', user.bp)
        .maybeSingle();

      const userData = {
        bp: user.bp,
        name: user.name,
        email: user.email,
        position: user.roles && user.roles.includes('supervisor') ? 'Supervisor' :
                 user.roles && user.roles.length > 1 
          ? (user.roles[1] === 'employee' ? 'Colaborador' : 
             user.roles[1] === 'supervisor' ? 'Supervisor' : 
             user.roles[1] === 'coordinator' ? 'Coordenador' : 
             user.roles[1] === 'manager' ? 'Gerente' : user.roles[1])
          : (user.roles && user.roles[0] === 'admin' ? 'Administrador' : 
             user.roles && user.roles[0] === 'supervisor' ? 'Supervisor' : 
             user.roles && user.roles[0] === 'coordinator' ? 'Coordenador' : 
             user.roles && user.roles[0] === 'manager' ? 'Gerente' : 'Colaborador'),
        is_active: true
      };

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('base_employees')
          .update(userData)
          .eq('bp', userData.bp);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('base_employees')
          .insert([userData]);
        error = insertError;
      }

      if (error) {
        // Se o erro for sobre coluna não encontrada, tenta identificar qual e remover
        if (error.message.includes('column') && error.message.includes('not found')) {
          const match = error.message.match(/'([^']+)' column/);
          if (match && match[1]) {
            const missingColumn = match[1];
            console.warn(`Removendo coluna inexistente '${missingColumn}' e tentando sincronização novamente...`);
            const filteredData = { ...userData } as any;
            delete filteredData[missingColumn];
            
            const { error: retryError } = existing 
              ? await supabase.from('base_employees').update(filteredData).eq('bp', userData.bp)
              : await supabase.from('base_employees').insert([filteredData]);
            
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      await supabase.from('audit_log').insert({
        action: `Sincronização Híbrida: ${user.name} adicionado à base operacional ${base.code_iata}`,
        table_name: 'base_employees',
        record_id: user.id as any
      });

      alert(`${user.name} agora consta como Colaborador Operacional na base ${base.code_iata}.`);
    } catch (error: any) {
      console.error('Error syncing to operational:', error);
      alert(`Erro na sincronização: ${error.message}`);
    } finally {
      setSyncingUserId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          bp: newUserForm.bp,
          name: newUserForm.name,
          email: newUserForm.email,
          password_plain: btoa(unescape(encodeURIComponent(newUserForm.password))),
          roles: newUserForm.role === 'pending' ? ['pending'] : [newUserForm.role],
          base_id: newUserForm.base_id || null
        }])
        .select();

      if (error) throw error;

      if (data) {
        setUsers(prev => [data[0], ...prev]);
        await supabase.from('audit_log').insert({
          action: `Cadastro emergencial de usuário: ${newUserForm.name}`,
          table_name: 'users',
          record_id: data[0].id
        });
      }

      setShowAddUserModal(false);
      setNewUserForm({ bp: '', name: '', email: '', password: '', role: 'pending', base_id: '' });
      alert('Usuário cadastrado com sucesso!');
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert(`Erro ao cadastrar usuário: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`TEM CERTEZA? Esta é uma REMOÇÃO EMERGENCIAL. O acesso de ${userName} será interrompido imediatamente e seus dados serão deletados.`)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      // First, unassign from any bases to avoid FK constraints
      await supabase.from('bases').update({ supervisor_id: null }).eq('supervisor_id', userId);
      await supabase.from('bases').update({ coordinator_id: null }).eq('coordinator_id', userId);
      await supabase.from('bases').update({ manager_id: null }).eq('manager_id', userId);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      
      await supabase.from('audit_log').insert({
        action: `REMOÇÃO EMERGENCIAL: Usuário ${userName} deletado`,
        table_name: 'users',
        record_id: userId as any
      });

      alert('Usuário removido com sucesso!');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Erro ao remover usuário: ${error.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleUpdateLlmConfig = async (provider: string, model: string, silent = false) => {
    setSavingLlm(true);
    try {
      const newConfig = { provider, model };
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'llm_config', value: newConfig });

      if (error) throw error;
      
      setLlmConfig(newConfig);
      
      await supabase.from('audit_log').insert({
        action: `Configuração de IA alterada: ${provider} - ${model}`,
        table_name: 'system_settings'
      });

      if (!silent) {
        alert('Configuração de IA salva com sucesso!');
      }
    } catch (error: any) {
      console.error('Error saving LLM config:', error);
      if (!silent) {
        alert('Erro ao salvar configuração: ' + error.message);
      }
    } finally {
      setSavingLlm(false);
    }
  };

  const storagePercentage = (storageUsed / storageLimit) * 100;
  
  const getStorageColor = () => {
    if (storageUsed >= 450) return 'text-red-600 bg-red-100';
    if (storageUsed >= 350) return 'text-orange-600 bg-orange-100';
    if (storageUsed >= 250) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStorageBarColor = () => {
    if (storageUsed >= 450) return '#dc2626';
    if (storageUsed >= 350) return '#ea580c';
    if (storageUsed >= 250) return '#ca8a04';
    return '#16a34a';
  };

  const chartData = [
    { name: 'Usado', value: storageUsed },
    { name: 'Disponível', value: storageLimit - storageUsed }
  ];

  const COLORS = [getStorageBarColor(), '#f3f4f6'];

  const openRoleModal = (role: string) => {
    setSelectedRoleForModal(role);
    setShowRoleModal(true);
  };

  const openBaseModal = (baseId: string) => {
    setSelectedBaseIdForModal(baseId);
    setShowBaseModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-latam-indigo/20 border-t-latam-indigo rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Carregando SGEI Admin...</p>
        </div>
      </div>
    );
  }

  // Render preview if not in admin mode
  if (viewMode !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-amber-800">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Eye size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">Modo de Visualização Ativo</p>
              <p className="text-xs opacity-80">Você está visualizando a tela de: <span className="capitalize font-bold">{viewMode}</span></p>
            </div>
          </div>
          <button 
            onClick={() => setViewMode('admin')}
            className="bg-white border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm"
          >
            Voltar ao Admin
          </button>
        </div>

        {viewMode === 'manager' && <ManagerDashboard />}
        {viewMode === 'coordinator' && <CoordinatorDashboard />}
        {viewMode === 'supervisor' && <SupervisorDashboard />}
        {viewMode === 'employee' && <EmployeeDashboard />}
      </div>
    );
  }

  const handleUpdateSuggestionStatus = async (id: string, newStatus: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('system_suggestions')
      .update({ 
        status: newStatus,
        updated_at: now
      })
      .eq('id', id);
    
    if (!error) {
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, updated_at: now } : s));
    }
  };

  const handleDeleteSuggestion = async (id: string) => {
    const { error } = await supabase
      .from('system_suggestions')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setSuggestions(prev => prev.filter(s => s.id !== id));
    }
  };

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    handleUpdateSuggestionStatus(draggableId, newStatus);
  };

  const kanbanColumns = {
    pendente: { title: 'Pendente', items: suggestions.filter(s => s.status === 'pendente' || !s.status) },
    em_analise: { title: 'Em Análise', items: suggestions.filter(s => s.status === 'em_analise') },
    em_progresso: { title: 'Em Progresso', items: suggestions.filter(s => s.status === 'em_progresso' || s.status === 'implementado') },
    finalizado: { title: 'Finalizado', items: suggestions.filter(s => s.status === 'finalizado' || s.status === 'arquivado') }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Storage Alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-latam-indigo rounded-2xl flex items-center justify-center shadow-lg shadow-latam-indigo/20 shrink-0">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Painel de Controle Global</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Visão geral da infraestrutura e governança da LATAM Cargo.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* View Mode Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-latam-indigo" />
                <span>Visualizar como...</span>
              </div>
              <ChevronDown size={16} className={`transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showViewDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { setViewMode('manager'); setShowViewDropdown(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Gerente</p>
                        <p className="text-[10px] text-slate-500">Visão consolidada</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setViewMode('coordinator'); setShowViewDropdown(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                        <MapIcon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Coordenador</p>
                        <p className="text-[10px] text-slate-500">Gestão regional</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setViewMode('supervisor'); setShowViewDropdown(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                        <ClipboardList size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Supervisor</p>
                        <p className="text-[10px] text-slate-500">Gestão de base</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setViewMode('employee'); setShowViewDropdown(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                        <UserIcon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Colaborador</p>
                        <p className="text-[10px] text-slate-500">Escala pessoal</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => {
              setEmergencyMode('create');
              setShowAddUserModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-latam-indigo text-white rounded-xl text-sm font-bold hover:bg-[#001a54] transition shadow-lg shadow-latam-indigo/20 w-full sm:w-auto"
          >
            <UserPlus size={16} />
            Gestão Emergencial
          </button>
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 w-full sm:w-auto"
          >
            <ExternalLink size={16} />
            Supabase Dashboard
          </a>
          <AnimatePresence>
            {storageUsed >= 250 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm w-full sm:w-auto ${getStorageColor()}`}
              >
                <AlertTriangle size={16} />
                <span>Alerta de Espaço: {storageUsed}MB / 500MB</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Maintenance Alert for missing bases */}
      {bases.length === 0 && !loading && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-amber-600 shrink-0" size={24} />
          <div className="space-y-2">
            <h3 className="font-bold text-amber-900">Nenhuma base encontrada</h3>
            <p className="text-sm text-amber-800">
              Isso pode ocorrer por dois motivos:
            </p>
            <ul className="text-sm text-amber-800 list-disc ml-5 space-y-1">
              <li><strong>RLS (Segurança):</strong> As políticas de segurança do Supabase podem estar bloqueando a leitura da tabela <code className="bg-amber-100 px-1 rounded">bases</code>.</li>
              <li><strong>Dados Ausentes:</strong> A base JPA ainda não foi inserida no banco de dados.</li>
            </ul>
            <div className="pt-2 flex gap-3">
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await supabase.from('bases').insert([
                      { code_iata: 'JPA', name: 'João Pessoa' }
                    ]);
                    if (error) throw error;
                    alert('Base JPA inserida com sucesso!');
                    fetchData();
                  } catch (err: any) {
                    alert('Erro ao inserir base: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition"
              >
                Inserir Base JPA Manualmente
              </button>
              <button 
                onClick={() => {
                  const sql = `-- ==========================================
-- SCRIPT DE ENDURECIMENTO DE SEGURANÇA (HARDENING)
-- ==========================================

-- 1. INJEÇÃO DE CUSTOM CLAIMS NO JWT
-- Cria uma função segura que copia a função (role) do usuário para o app_metadata do Auth
CREATE OR REPLACE FUNCTION public.sync_roles_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{roles}',
    to_jsonb(NEW.roles)
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Cria o gatilho para manter o JWT sempre atualizado
DROP TRIGGER IF EXISTS on_user_role_change ON public.users;
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR UPDATE OF roles ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_roles_to_app_metadata();

-- Força a sincronização imediata para todos os usuários existentes
UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  COALESCE(au.raw_app_meta_data, '{}'::jsonb),
  '{roles}',
  to_jsonb(pu.roles)
)
FROM public.users pu
WHERE au.id = pu.id;

-- 2. FUNÇÃO AUXILIAR PARA LER O JWT (COM FALLBACK)
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT 
    -- 1. Tenta ler do JWT (Rápido e seguro, para o futuro e middleware)
    COALESCE((auth.jwt() -> 'app_metadata' -> 'roles') ? role_name, false)
    OR 
    -- 2. Fallback de segurança: Verifica direto na tabela (Garante que não quebre a sessão atual)
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role_name = ANY(roles)
    )
    OR
    -- 3. Super Admin Fallback (Garante que você nunca perca acesso)
    (auth.jwt() ->> 'email' = 'bernardo.real@latam.com');
$$;

-- 3. PROTEÇÃO CONTRA ESCALONAMENTO DE PRIVILÉGIOS (COLUMN-LEVEL SECURITY)
-- Impede que usuários comuns alterem suas próprias permissões, matrícula ou status
CREATE OR REPLACE FUNCTION public.protect_secure_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    IF NEW.roles IS DISTINCT FROM OLD.roles OR
       NEW.bp IS DISTINCT FROM OLD.bp OR
       NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Security Violation: Privilege Escalation Attempt Blocked.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_secure_columns ON public.users;
CREATE TRIGGER ensure_secure_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_secure_columns();

-- 4. REESCREVENDO O RLS (FECHANDO AS BRECHAS DO "USING TRUE")

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Enable all access for admin email" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;

-- Admins veem todos. Usuários veem a si mesmos.
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (public.has_role('admin'));
CREATE POLICY "Users can view themselves" ON public.users FOR SELECT USING (id = auth.uid());

-- Admins gerenciam todos. Usuários atualizam a si mesmos (protegidos pelo trigger acima).
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (public.has_role('admin'));
CREATE POLICY "Users can update themselves" ON public.users FOR UPDATE USING (id = auth.uid());

-- AUDIT_LOG & AI_USAGE_LOGS (Dados Sensíveis)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.audit_log;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role('admin'));
CREATE POLICY "Enable insert for authenticated" ON public.audit_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Admins can view ai logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can view ai logs" ON public.ai_usage_logs FOR SELECT USING (public.has_role('admin'));
CREATE POLICY "Enable insert for anon" ON public.ai_usage_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- BASES, ROLES, KNOWLEDGE_BASE (Dados Públicos de Leitura)
-- Mantemos a leitura para todos os autenticados, pois o app precisa listar as bases e roles nos formulários
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.bases;
DROP POLICY IF EXISTS "Authenticated can view bases" ON public.bases;
DROP POLICY IF EXISTS "Admins can manage bases" ON public.bases;
CREATE POLICY "Authenticated can view bases" ON public.bases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage bases" ON public.bases FOR ALL USING (public.has_role('admin'));

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated can view KB" ON public.knowledge_base;
DROP POLICY IF EXISTS "Admins can manage KB" ON public.knowledge_base;
CREATE POLICY "Authenticated can view KB" ON public.knowledge_base FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage KB" ON public.knowledge_base FOR ALL USING (public.has_role('admin'));

ALTER TABLE public.base_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.base_employees;
DROP POLICY IF EXISTS "Authenticated can view base_employees" ON public.base_employees;
DROP POLICY IF EXISTS "Admins can manage base_employees" ON public.base_employees;
CREATE POLICY "Authenticated can view base_employees" ON public.base_employees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage base_employees" ON public.base_employees FOR ALL USING (public.has_role('admin'));
`;
                  navigator.clipboard.writeText(sql);
                  alert('SQL de reparo copiado para a área de transferência! Execute-o no SQL Editor do Supabase.');
                }}
                className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition"
              >
                Copiar SQL de Reparo (RLS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      {users.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-amber-500" />
          <div>
            <p className="font-bold text-sm">Nenhum usuário carregado.</p>
            <p className="text-xs">Isso pode ser causado por políticas de RLS no Supabase bloqueando o acesso. Certifique-se de que as políticas para o e-mail <strong>bernardo.real@latam.com</strong> estão configuradas corretamente.</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Usuários" 
          value={stats.total} 
          icon={<Users size={24} />} 
          trend="+12% este mês"
          color="blue"
        />
        <div onClick={() => openRoleModal('pending')} className="cursor-pointer">
          <StatCard 
            title="Aguardando Role" 
            value={stats.roleCounts['pending'] || 0} 
            icon={<UserPlus size={24} />} 
            trend="Clique para atribuir"
            color="amber"
            highlight={(stats.roleCounts['pending'] || 0) > 0}
          />
        </div>
        <StatCard 
          title="Bases Ativas" 
          value={stats.activeBases} 
          icon={<Database size={24} />} 
          trend="JPA Piloto"
          color="indigo"
        />
        <StatCard 
          title="Uso de Banco" 
          value={`${storagePercentage.toFixed(1)}%`} 
          icon={<HardDrive size={24} />} 
          trend={`${storageLimit - storageUsed}MB livres`}
          color="emerald"
        />
      </div>

      {/* Role Distribution Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-latam-indigo" />
          Distribuição de Roles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { id: 'admin', label: 'Administradores', color: 'red' },
            { id: 'manager', label: 'Gerentes', color: 'purple' },
            { id: 'coordinator', label: 'Coordenadores', color: 'blue' },
            { id: 'supervisor', label: 'Supervisores', color: 'indigo' },
            { id: 'employee', label: 'Colaboradores', color: 'green' }
          ].map(role => (
            <div key={role.id} onClick={() => openRoleModal(role.id)} className="cursor-pointer">
              <RoleCard 
                label={role.label}
                count={stats.roleCounts[role.id] || 0}
                color={role.color}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Role Management Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">
                      {selectedRoleForModal === 'pending' ? 'Usuários Pendentes' : `Role: ${selectedRoleForModal}`}
                    </h3>
                    <p className="text-sm text-gray-500">{usersInSelectedRole.length} usuários encontrados</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                {usersInSelectedRole.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-20" />
                    <p>Nenhum usuário encontrado nesta categoria.</p>
                  </div>
                ) : (
                  usersInSelectedRole.map(user => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          {user.roles && user.roles.includes('employee') && user.roles.some((r: string) => ['admin', 'manager', 'coordinator', 'supervisor'].includes(r)) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200">
                              <Sparkles size={10} />
                              HÍBRIDO
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {['employee', 'supervisor', 'manager', 'coordinator', 'admin'].map(role => (
                            <button
                              key={role}
                              disabled={updatingUserId === user.id}
                              onClick={() => handleAssignRole(user.id, role)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 capitalize ${
                                (user.roles || []).includes(role)
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'border-gray-200 hover:border-indigo-600 hover:text-indigo-600'
                              }`}
                            >
                              {updatingUserId === user.id ? '...' : role}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Base:</span>
                          <select
                            disabled={updatingUserId === user.id}
                            value={user.base_id || ''}
                            onChange={(e) => handleAssignBase(user.id, e.target.value || null)}
                            className="text-[10px] py-1 px-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                          >
                            <option value="">Nenhuma / Global</option>
                            {bases.map(base => (
                              <option key={base.id} value={base.id}>{base.code_iata} - {base.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="w-full sm:w-auto px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Base Management Modal */}
      <AnimatePresence>
        {showBaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                    <Database size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Gestão de Usuários: {bases.find(b => b.id === selectedBaseIdForModal)?.code_iata}
                    </h3>
                    <p className="text-sm text-gray-500">{usersInSelectedBase.length} colaboradores vinculados</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBaseModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                {usersInSelectedBase.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum colaborador vinculado a esta base.</p>
                  </div>
                ) : (
                  usersInSelectedBase.map(user => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{user.name}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {user.roles && user.roles.includes('employee') && user.roles.some((r: string) => ['admin', 'manager', 'coordinator', 'supervisor'].includes(r)) && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200">
                            <Sparkles size={10} />
                            HÍBRIDO
                          </div>
                        )}
                        <button 
                          onClick={() => handleSyncToOperational(user)}
                          disabled={syncingUserId === user.id}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                          title="Vincular como Colaborador Operacional (Híbrido)"
                        >
                          {syncingUserId === user.id ? '...' : <Sparkles size={14} />}
                          Sincronizar
                        </button>
                        <div className="flex flex-wrap gap-1">
                          {['employee', 'supervisor', 'manager', 'coordinator', 'admin'].map(role => (
                            <button
                              key={role}
                              disabled={updatingUserId === user.id}
                              onClick={() => handleAssignRole(user.id, role)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 capitalize ${
                                (user.roles || []).includes(role)
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'border-gray-200 hover:border-indigo-600 hover:text-indigo-600'
                              }`}
                            >
                              {updatingUserId === user.id ? '...' : role}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                          title="Remoção Emergencial"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setShowBaseModal(false)}
                  className="w-full sm:w-auto px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency Management Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                    {emergencyMode === 'create' ? <UserPlus size={24} /> : <Users size={24} />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Gestão Emergencial</h3>
                </div>
                <button type="button" onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setEmergencyMode('create')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${emergencyMode === 'create' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Novo Cadastro
                </button>
                <button 
                  onClick={() => setEmergencyMode('delete')}
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${emergencyMode === 'delete' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Excluir Usuário
                </button>
              </div>

              {emergencyMode === 'create' ? (
                <form onSubmit={handleAddUser}>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">BP (Matrícula)</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newUserForm.bp}
                        onChange={e => setNewUserForm({...newUserForm, bp: e.target.value})}
                        placeholder="Ex: 4598394"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newUserForm.name}
                        onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail Corporativo</label>
                      <input 
                        required
                        type="email" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newUserForm.email}
                        onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                        placeholder="exemplo.nome@latam.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Senha</label>
                      <input 
                        required
                        type="password" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newUserForm.password}
                        onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Role</label>
                        <select 
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          value={newUserForm.role}
                          onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                        >
                          <option value="pending">Pendente</option>
                          <option value="employee">Colaborador</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="coordinator">Coordenador</option>
                          <option value="manager">Gerente</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Base</label>
                        <select 
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          value={newUserForm.base_id}
                          onChange={e => setNewUserForm({...newUserForm, base_id: e.target.value})}
                        >
                          <option value="">Nenhuma</option>
                          {bases.map(base => (
                            <option key={base.id} value={base.id}>{base.code_iata} - {base.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="w-full sm:w-auto px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-100 transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                    >
                      {loading ? 'Cadastrando...' : 'Cadastrar Usuário'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Buscar por nome ou BP..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      value={deleteSearchQuery}
                      onChange={e => setDeleteSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredUsersForDeletion.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm italic">
                        {deleteSearchQuery ? 'Nenhum usuário encontrado.' : 'Digite o nome ou BP para buscar.'}
                      </div>
                    ) : (
                      filteredUsersForDeletion.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-red-50 transition-colors gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-sm truncate">{user.name}</div>
                            <div className="text-xs text-gray-500 truncate">BP: {user.bp} | {user.email}</div>
                          </div>
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={updatingUserId === user.id}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                          >
                            {updatingUserId === user.id ? '...' : <X size={18} />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Base Management Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Database size={20} className="text-indigo-600" />
          Gestão de Bases e Lideranças
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Base</th>
                  <th className="px-6 py-4 font-medium">Distribuição</th>
                  <th className="px-6 py-4 font-medium">Supervisor (1:1)</th>
                  <th className="px-6 py-4 font-medium">Coordenador (N:1)</th>
                  <th className="px-6 py-4 font-medium">Gerente (N:1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bases.map(base => (
                  <tr 
                    key={base.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => openBaseModal(base.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{base.code_iata}</div>
                      <div className="text-xs text-gray-500">{base.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {Object.entries(baseStats[base.id] || {}).map(([role, count]) => (
                          count > 0 && (
                            <div 
                              key={role} 
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                role === 'employee' ? 'bg-green-100 text-green-700' :
                                role === 'supervisor' ? 'bg-indigo-100 text-indigo-700' :
                                role === 'coordinator' ? 'bg-blue-100 text-blue-700' :
                                role === 'manager' ? 'bg-purple-100 text-purple-700' :
                                role === 'admin' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}
                              title={`${count} ${role}`}
                            >
                              {role.charAt(0)}:{count}
                            </div>
                          )
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={updatingBaseId === base.id}
                        value={base.supervisor_id || ''}
                        onChange={(e) => handleUpdateBaseAssignment(base.id, 'supervisor_id', e.target.value || null)}
                        className="text-xs py-1.5 px-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full min-w-[130px] max-w-[150px]"
                      >
                        <option value="">Não atribuído</option>
                        {users.filter(u => (u.roles || []).some(r => ['supervisor', 'admin'].includes(r))).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={updatingBaseId === base.id}
                        value={base.coordinator_id || ''}
                        onChange={(e) => handleUpdateBaseAssignment(base.id, 'coordinator_id', e.target.value || null)}
                        className="text-xs py-1.5 px-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full min-w-[130px] max-w-[150px]"
                      >
                        <option value="">Não atribuído</option>
                        {users.filter(u => (u.roles || []).some(r => ['coordinator', 'admin'].includes(r))).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={updatingBaseId === base.id}
                        value={base.manager_id || ''}
                        onChange={(e) => handleUpdateBaseAssignment(base.id, 'manager_id', e.target.value || null)}
                        className="text-xs py-1.5 px-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full min-w-[130px] max-w-[150px]"
                      >
                        <option value="">Não atribuído</option>
                        {users.filter(u => (u.roles || []).some(r => ['manager', 'admin'].includes(r))).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Configuration Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Cpu size={20} className="text-indigo-600" />
          Configurações de Inteligência Artificial
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Configuração do Motor */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings size={18} className="text-indigo-600" />
                Motor de Escalas
              </h3>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Provedor</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const newProvider = 'gemini';
                      const newModel = 'gemini-1.5-flash';
                      setLlmConfig({ provider: newProvider, model: newModel });
                      handleUpdateLlmConfig(newProvider, newModel, true);
                    }}
                    className={`flex-1 py-2 rounded-lg border transition-all text-xs font-bold ${llmConfig.provider === 'gemini' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-100 text-gray-400'}`}
                  >
                    Gemini
                  </button>
                  <button 
                    onClick={() => {
                      const newProvider = 'openrouter';
                      const newModel = 'google/gemma-2-9b-it:free';
                      setLlmConfig({ provider: newProvider, model: newModel });
                      handleUpdateLlmConfig(newProvider, newModel, true);
                    }}
                    className={`flex-1 py-2 rounded-lg border transition-all text-xs font-bold ${llmConfig.provider === 'openrouter' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-100 text-gray-400'}`}
                  >
                    OpenRouter
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Modelo</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={llmConfig.model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setLlmConfig({ ...llmConfig, model: newModel });
                    handleUpdateLlmConfig(llmConfig.provider, newModel, true);
                  }}
                >
                  {llmConfig.provider === 'gemini' ? (
                    <>
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Mais Recente - Recomendado)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complexo/Raciocínio)</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Econômico)</option>
                      <option value="gemini-flash-latest">Gemini Flash Latest (Sempre Atualizado)</option>
                      <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (Experimental)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legado)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legado)</option>
                    </>
                  ) : (
                    <>
                      <option value="google/gemma-2-9b-it:free">Gemma 2 9B (FREE - Google)</option>
                      <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (FREE - Meta)</option>
                      <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (FREE - Alibaba)</option>
                      <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (FREE - Mistral AI)</option>
                      <option value="microsoft/phi-3-mini-128k-instruct:free">Phi-3 Mini (FREE - Microsoft)</option>
                      <option value="huggingfaceh4/zephyr-7b-beta:free">Zephyr 7B Beta (FREE)</option>
                      <option value="openchat/openchat-7b:free">OpenChat 7B (FREE)</option>
                      <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (FREE - Meta)</option>
                    </>
                  )}
                </select>
                {llmConfig.provider === 'openrouter' && (
                  <p className="mt-1 text-[9px] text-amber-600 font-medium italic">
                    * Modelos gratuitos do OpenRouter podem estar sujeitos a instabilidade ou limites de cota.
                  </p>
                )}
                
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-indigo-900">
                      Modelo principal: {llmConfig.model}
                    </span>
                    <span className="text-[10px] text-indigo-600 italic mt-1">
                      * O Supervisor precisa atualizar o Dashboard para aplicar mudanças.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Controle de Custos (OpenRouter) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" />
              Controle Financeiro
            </h3>
            
            {llmConfig.provider === 'gemini' ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Requisições Hoje (Plano Free)</div>
                  <div className="text-3xl font-black text-emerald-700">
                    {geminiDailyRequests} <span className="text-lg text-emerald-600/70">/ 1500</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                    <span>Consumo Diário</span>
                    <span>{((geminiDailyRequests / 1500) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${geminiDailyRequests > 1200 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((geminiDailyRequests / 1500) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 italic mt-2">
                  * O plano gratuito do Gemini possui limite de 1.500 requisições por dia.
                </p>
              </div>
            ) : openRouterInfo ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Saldo Disponível</div>
                  <div className="text-3xl font-black text-emerald-700">
                    {openRouterInfo.limit ? `$${(openRouterInfo.limit - openRouterInfo.usage).toFixed(2)}` : 'Ilimitado'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Uso Total</div>
                    <div className="text-lg font-bold text-gray-900">${openRouterInfo.usage.toFixed(4)}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Limite</div>
                    <div className="text-lg font-bold text-gray-900">{openRouterInfo.limit ? `$${openRouterInfo.limit}` : 'N/A'}</div>
                  </div>
                </div>

                {openRouterInfo.limit && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                      <span>Consumo do Limite</span>
                      <span>{((openRouterInfo.usage / openRouterInfo.limit) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${Math.min((openRouterInfo.usage / openRouterInfo.limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm italic text-center p-4">
                Aguardando conexão com OpenRouter...
              </div>
            )}
          </div>

          {/* Card 3: Controle de Tokens */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" />
              Estatísticas de Tokens
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Total de Tokens</div>
                <div className="text-3xl font-black text-indigo-700">
                  {tokenStats.total.toLocaleString()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-xs font-bold text-gray-600 uppercase">Input (Prompt)</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">{tokenStats.prompt.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-xs font-bold text-gray-600 uppercase">Output (Completion)</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">{tokenStats.completion.toLocaleString()}</span>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-blue-700 leading-relaxed italic">
                    * Tokens do sistema são contabilizados em cada requisição para monitoramento de eficiência.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                Gestão de Usuários
              </h2>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou e-mail..."
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-auto"
                  value={selectedBase}
                  onChange={(e) => setSelectedBase(e.target.value)}
                >
                  <option value="all">Todas as Bases</option>
                  {bases.map(base => (
                    <option key={base.id} value={base.id}>{base.code_iata} - {base.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Usuário</th>
                    <th className="px-6 py-4 font-medium">Cargo / Role</th>
                    <th className="px-6 py-4 font-medium">Base</th>
                    <th className="px-6 py-4 font-medium">Data Cadastro</th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                          <span>Carregando usuários...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        Nenhum usuário encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {console.log('Rendering ALL users:', users)}
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.roles && user.roles.length > 0 && user.roles[0] !== 'pending' ? (
                              <div className="flex flex-wrap gap-1">
                                {user.roles.includes('supervisor') ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize bg-amber-50 text-amber-700 border border-amber-100">
                                    Supervisor
                                  </span>
                                ) : user.roles.length > 1 ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700">
                                    {user.roles[1] === 'employee' ? 'Colaborador' : user.roles[1]}
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                                    user.roles[0] === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                                  }`}>
                                    {user.roles[0] === 'admin' ? 'Administrador' : 
                                     user.roles[0] === 'employee' ? 'Colaborador' : user.roles[0]}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 flex items-center gap-1 w-fit">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {bases.find(b => b.id === user.base_id)?.code_iata || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remoção Emergencial"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

        {/* Sidebar: Storage & Logs */}
        <div className="space-y-8">
          {/* Storage KPI Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <HardDrive size={18} className="text-emerald-600" />
              Armazenamento Supabase
            </h3>
            
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{storagePercentage.toFixed(0)}%</span>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">Usado</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Espaço Utilizado</span>
                <span className="font-medium text-gray-900">{storageUsed} MB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000" 
                  style={{ 
                    width: `${storagePercentage}%`, 
                    backgroundColor: getStorageBarColor() 
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 MB</span>
                <span>Plano Spark: 500 MB</span>
              </div>
            </div>
          </div>

          {/* Audit Logs Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" />
                Logs do Banco
              </h3>
              <button className="text-xs text-indigo-600 hover:underline">Ver todos</button>
            </div>

            <div className="space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm italic">
                  Nenhum log recente registrado.
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{log.action}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="font-mono">{log.table_name}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Sugestões de Melhoria (Admin View - Kanban) */}
      <div className="mt-12 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sugestões de Melhoria</h3>
              <p className="text-slate-500 font-medium">Gerencie as solicitações de melhoria via Kanban drag-and-drop.</p>
            </div>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 uppercase tracking-widest">
            {suggestions.length} Sugestões
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(kanbanColumns).map(([columnId, column]) => (
              <div key={columnId} className="flex flex-col h-full min-h-[500px] bg-slate-50/50 rounded-[24px] p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      columnId === 'pendente' ? 'bg-slate-400' :
                      columnId === 'em_analise' ? 'bg-blue-400' :
                      columnId === 'em_progresso' ? 'bg-orange-400' :
                      'bg-green-400'
                    }`} />
                    {column.title}
                  </h4>
                  <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 border border-slate-100">
                    {column.items.length}
                  </span>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 space-y-3 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {column.items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500/20 rotate-2' : 'hover:border-indigo-200'}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-400 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={14} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900">{item.user_name}</span>
                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{item.user_role}</span>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                  item.priority === 'crítica' ? 'bg-red-100 text-red-700' :
                                  item.priority === 'alta' ? 'bg-orange-100 text-orange-700' :
                                  item.priority === 'média' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                              
                              <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3 group-hover:line-clamp-none transition-all">
                                {item.suggestion}
                              </p>

                              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </span>
                                {columnId === 'finalizado' && (
                                  <button 
                                    onClick={() => handleDeleteSuggestion(item.id)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir Sugestão"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* AI Analysis Section */}
        <AnimatePresence>
          {(isAnalyzing || analysis) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-12 bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Análise Estratégica de Solicitações</h3>
                    <p className="text-slate-400 text-xs font-medium">Insights gerados por IA sobre viabilidade e priorização técnica.</p>
                  </div>
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Analisando...</span>
                  </div>
                )}
              </div>

              <div className="p-8">
                {isAnalyzing && !analysis ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center animate-bounce">
                      <Cpu className="text-indigo-500" size={32} />
                    </div>
                    <p className="text-slate-400 font-bold text-sm animate-pulse">Processando requisitos técnicos...</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-black prose-p:text-slate-600 prose-strong:text-slate-900 prose-table:border prose-table:border-slate-100 prose-th:bg-slate-50 prose-th:p-3 prose-td:p-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysis || ''}
                    </ReactMarkdown>
                  </div>
                )}
                
                <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={analyzeSuggestions}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    <Activity size={16} />
                    Recalcular Análise
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Implementation History Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <History className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Histórico de Implementações</h3>
              <p className="text-slate-500 text-xs font-medium">Registro cronológico de melhorias concluídas e entregues.</p>
            </div>
          </div>

          {finalizedHistory.length === 0 ? (
            <div className="bg-slate-50 rounded-[32px] p-12 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <CheckCircle size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">Nenhuma melhoria finalizada até o momento.</p>
              <p className="text-slate-300 text-xs mt-1">Mova cards para a coluna &quot;Finalizado&quot; para popular este histórico.</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Vertical Line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-slate-100" />

              {finalizedHistory.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-2xl border-2 border-emerald-500 shadow-sm flex items-center justify-center z-10">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                  </div>

                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.user_name}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.user_role}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                          {item.suggestion}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg mb-1">
                          Concluído
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(item.updated_at || item.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ label, count, color }: { label: string, count: number, color: string }) {
  const colorClasses: any = {
    red: 'border-latam-crimson/20 bg-latam-crimson/5 text-latam-crimson',
    purple: 'border-purple-100 bg-purple-50/30 text-purple-700',
    blue: 'border-blue-100 bg-blue-50/30 text-blue-700',
    indigo: 'border-latam-indigo/20 bg-latam-indigo/5 text-latam-indigo',
    green: 'border-green-100 bg-green-50/30 text-green-700',
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`p-4 rounded-2xl border shadow-sm transition-all ${colorClasses[color] || 'border-slate-100 bg-slate-50/30 text-slate-700'}`}
    >
      <div className="text-2xl font-black">{count}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, trend, color, highlight = false }: any) {
  const colorClasses: any = {
    blue: 'border-blue-100 bg-blue-50/30',
    amber: 'border-amber-100 bg-amber-50/30',
    indigo: 'border-latam-indigo/10 bg-latam-indigo/5',
    emerald: 'border-emerald-100 bg-emerald-50/30',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`p-6 rounded-3xl border shadow-sm transition-all ${colorClasses[color] || 'border-slate-100 bg-slate-50/30'} ${highlight ? 'ring-2 ring-latam-crimson ring-offset-2' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-latam-indigo">
          {icon}
        </div>
        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
          {trend}
          <ArrowUpRight size={12} className="text-latam-crimson" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{title}</div>
      </div>
    </motion.div>
  );
}
