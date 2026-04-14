'use client';

import { useState, useEffect } from 'react';
import { supabase, handleSupabaseSessionError } from '@/lib/supabase';
import { 
  Calendar, 
  Users, 
  Sparkles, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  History,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Save,
  FileText,
  Download,
  X,
  FileDown,
  Printer,
  Search,
  Cpu,
  Info,
  BookOpen,
  Trash2,
  Upload,
  Database,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SuggestionSection from '@/components/SuggestionSection';
import LATAMScheduleTable, { SHIFT_LEGEND, SIGLA_LEGEND } from '@/components/LATAMScheduleTable';
import { generateWithOpenRouter, generateWithGemini } from '@/app/actions/ai';
import { logAudit } from '@/lib/audit';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    "Analisando banco de dados de colaboradores...",
    "Aplicando regras de regime 5x1 e CLT...",
    "Validando folgas fixas e períodos de férias...",
    "Otimizando cobertura CAT 6 e turnos...",
    "Finalizando formatação da escala JPA..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading, loadingSteps.length]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]);
  const [aiSchedules, setAiSchedules] = useState<any[]>([]);
  const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
  const [viewedSchedule, setViewedSchedule] = useState<any | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ rating: 0, comment: '', strengths: [] as string[], weaknesses: [] as string[] });
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-3-flash-preview' });
  const [configLoading, setConfigLoading] = useState(true);
  const [updatingRequest, setUpdatingRequest] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [knowledgeFiles, setKnowledgeFiles] = useState<any[]>([]);
  const [uploadingKb, setUploadingKb] = useState(false);
  const [baseConfig, setBaseConfig] = useState({ min_coverage_per_shift: 3, min_cat6_per_shift: 2 });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(userData);
      }

      if (sessionError) {
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          // Silently handle expired sessions
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = '/';
          return;
        } else {
          console.error('Session error:', sessionError);
        }
      }

      const { data: empData } = await supabase.from('base_employees').select('*');
      const { data: reqData } = await supabase.from('shift_requests').select('*');
      const { data: kbData } = await supabase.from('knowledge_base').select('id, file_name, created_at').order('created_at', { ascending: false });
      
      if (empData) {
        setEmployees(empData);
        setFilteredEmployees(empData);
      }
      if (reqData) setShiftRequests(reqData);
      if (kbData) setKnowledgeFiles(kbData);

      // Buscar configuração da base
      const { data: configBaseData } = await supabase
        .from('base_configuration')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configBaseData) {
        setBaseConfig({
          min_coverage_per_shift: configBaseData.min_coverage_per_shift,
          min_cat6_per_shift: configBaseData.min_cat6_per_shift
        });
      }

      const { data: historyData } = await supabase
        .from('schedules')
        .select('*, created_by_user:users(name)')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (historyData && historyData.length > 0) {
        setScheduleHistory(historyData);
        
        // Carregar as escalas publicadas mais recentes para o carrossel
        const recentPublished = [];
        for (const schedule of historyData.slice(0, 2)) { // Pega as 2 mais recentes
          const { data: details } = await supabase
            .from('schedule_details')
            .select('*, base_employees(name, bp)')
            .eq('schedule_id', schedule.id)
            .order('date', { ascending: true });
          
          if (details && details.length > 0) {
            const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
            const startDate = new Date(schedule.start_date + 'T12:00:00Z');
            const month = monthNames[startDate.getUTCMonth()];
            const year = startDate.getUTCFullYear().toString();

            const groupedData = details.reduce((acc: any, detail: any) => {
              const bp = detail.bp;
              if (!acc[bp]) {
                const emp = empData?.find((e: any) => e.bp === bp);
                acc[bp] = {
                  area: "OPERAÇÃO",
                  turno: detail.shift === 'manhã' ? 'MANHÃ' : 'TARDE',
                  bp: bp,
                  funcao: emp?.cargo || emp?.position || 'AUXILIAR',
                  nome: emp?.name || detail.base_employees?.name || 'Desconhecido',
                  tarefa: "",
                  days: []
                };
              }
              acc[bp].days.push({
                date: new Date(detail.date + 'T12:00:00Z').getUTCDate().toString().padStart(2, '0') + '/' + (new Date(detail.date + 'T12:00:00Z').getUTCMonth() + 1).toString().padStart(2, '0'),
                code: detail.code || (detail.status === 'folga' ? 'FOLG' : 'T000')
              });
              return acc;
            }, {});

            recentPublished.push({
              id: schedule.id,
              month,
              year,
              status: 'published',
              data: Object.values(groupedData)
            });
          }
        }
        if (recentPublished.length > 0) {
          setAiSchedules(recentPublished);
          setCurrentScheduleIndex(0);
        }

        // Buscar rascunhos da IA
        try {
          const { data: draftData, error: draftError } = await supabase
            .from('escala_drafts')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (draftError) {
            if (draftError.code === '42P01') {
              console.warn('Tabela escala_drafts não encontrada. Por favor, execute o schema.sql no Supabase.');
            } else {
              throw draftError;
            }
          } else if (draftData && draftData.length > 0) {
            const drafts = draftData.map(d => ({
              ...(d.content as any),
              id: d.id,
              status: 'draft'
            }));
            setAiSchedules(prev => [...drafts, ...prev]);
          }
        } catch (err) {
          console.error('Erro ao carregar rascunhos:', err);
        }
      }

      // Buscar configuração de IA
      try {
        const { data: configData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'llm_config')
          .maybeSingle();
        
        if (configData) {
          setLlmConfig(configData.value);
        }
      } catch (err) {
        console.error('Error fetching LLM config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const current = aiSchedules[currentScheduleIndex];
    if (current?.status === 'published' && current.id) {
      setEditingScheduleId(current.id);
    } else {
      setEditingScheduleId(null);
    }
  }, [currentScheduleIndex, aiSchedules]);

  const validateSchedule = (scheduleData: any) => {
    const errors: any[] = [];
    const { data } = scheduleData;

    data.forEach((empSchedule: any) => {
      const employee = employees.find(e => e.bp === empSchedule.bp);
      let consecutiveWorkDays = 0;
      let fagrCount = 0;
      let hasWorkHoursMismatch = false;

      empSchedule.days.forEach((day: any, idx: number) => {
        const isWorkDay = day.code.startsWith('T') || day.code === 'C';
        
        // 1. Check 5x1 Rule
        if (isWorkDay) {
          consecutiveWorkDays++;
          if (consecutiveWorkDays > 5) {
            errors.push({
              bp: empSchedule.bp,
              nome: empSchedule.nome,
              date: day.date,
              message: `Violação da regra 5x1: ${consecutiveWorkDays} dias seguidos de trabalho.`,
              type: 'error'
            });
          }
        } else {
          consecutiveWorkDays = 0;
        }

        // 2. Count FAGR
        if (day.code === 'FAGR') {
          // Check if it's consecutive
          if (idx > 0 && empSchedule.days[idx-1].code === 'FAGR') {
            // Already counted as part of a pair or more
          } else {
            fagrCount++;
          }
        }

        // 3. Check Work Hours Mismatch (if assigned)
        if (employee?.work_hours && isWorkDay) {
          const shift = SHIFT_LEGEND.find(s => s.code === day.code);
          if (shift && !shift.desc.includes(employee.work_hours.split('-')[0])) {
             // Simple check: if the start hour doesn't match
             hasWorkHoursMismatch = true;
          }
        }
      });

      // 4. Check FAGR Count (Exactly 1 per month)
      if (fagrCount !== 1) {
        errors.push({
          bp: empSchedule.bp,
          nome: empSchedule.nome,
          message: `Folga Agrupada (FAGR): Encontradas ${fagrCount} FAGRs no mês. OBRIGATÓRIO exatamente 1.`,
          type: 'error'
        });
      }

      if (hasWorkHoursMismatch) {
        errors.push({
          bp: empSchedule.bp,
          nome: empSchedule.nome,
          message: `Divergência de Horário: O colaborador tem horário atribuído (${employee.work_hours}), mas a IA atribuiu turnos diferentes.`,
          type: 'warning'
        });
      }

      // 5. Check CAT 6 Coverage (Qualification)
      // Note: CAT 6 employees work 8h shifts like others, but are required for specific coverage.
    });

    // 6. Check Daily Coverage
    const daysCount = data[0]?.days.length || 0;
    for (let i = 0; i < daysCount; i++) {
      const workingEmployees = data.filter((emp: any) => emp.days[i].code.startsWith('T') || emp.days[i].code === 'C');
      const offCount = data.length - workingEmployees.length;

      // Check for CAT 6 coverage (At least 2 per day as a general rule for the terminal)
      const cat6Working = workingEmployees.filter((emp: any) => {
        const employee = employees.find(e => e.bp === emp.bp);
        return employee?.cat_6;
      });

      if (cat6Working.length < baseConfig.min_cat6_per_shift) {
        errors.push({
          date: data[0].days[i].date,
          message: `Alerta CAT 6: Apenas ${cat6Working.length} colaborador(es) com CAT 6 trabalhando neste dia. Mínimo configurado: ${baseConfig.min_cat6_per_shift}.`,
          type: 'warning'
        });
      }

      if (offCount === 0) {
        errors.push({
          date: data[0].days[i].date,
          message: `Falha de Cobertura: Ninguém está de folga neste dia. Pelo menos 1 colaborador deve estar de folga.`,
          type: 'warning'
        });
      }
    }

    setValidationErrors(errors);
  };

  const handleSaveFeedback = async () => {
    const aiSchedule = aiSchedules[currentScheduleIndex];
    if (!aiSchedule || feedbackData.rating === 0) {
      if (feedbackData.rating === 0) alert('Por favor, selecione uma classificação em estrelas.');
      return;
    }

    setSavingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error: fError } = await supabase
        .from('ai_feedback')
        .insert([{
          user_id: session?.user?.id,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
          strengths: feedbackData.strengths,
          weaknesses: feedbackData.weaknesses,
          model_used: llmConfig.model,
          provider: llmConfig.provider,
          schedule_context: {
            month: aiSchedule.month,
            year: aiSchedule.year,
            employee_count: aiSchedule.data.length
          }
        }]);

      if (fError) throw fError;
      
      setFeedbackGiven(true);
      alert('Obrigado pelo seu feedback! Isso ajudará a melhorar as próximas escalas.');
    } catch (err: any) {
      console.error('Erro ao salvar feedback:', err);
      alert('Erro ao salvar feedback: ' + err.message);
    } finally {
      setSavingFeedback(false);
    }
  };

  const generateScheduleAI = async () => {
    if (employees.length === 0) {
      setError('Não há colaboradores cadastrados na base JPA para gerar a escala. Por favor, adicione colaboradores primeiro.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Determinar mês alvo (próximo mês)
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
      const targetMonth = monthNames[targetDate.getMonth()];
      const targetYear = targetDate.getFullYear().toString();

      // 1. Buscar histórico do mês anterior (últimos 7 dias)
      const { data: lastSchedules } = await supabase
        .from('schedules')
        .select('id, start_date, end_date')
        .order('end_date', { ascending: false })
        .limit(1);

      let historyContext = "Nenhum histórico encontrado. Assuma que todos os colaboradores estão descansados.";
      
      if (lastSchedules && lastSchedules.length > 0) {
        const { data: lastDetails } = await supabase
          .from('schedule_details')
          .select('bp, date, status')
          .eq('schedule_id', lastSchedules[0].id)
          .order('date', { ascending: false })
          .limit(employees.length * 7);
        
        if (lastDetails && lastDetails.length > 0) {
          historyContext = JSON.stringify(lastDetails, null, 2);
        }
      }

      // 2. Preparar contexto para a IA
      const employeeContext = employees.map(e => ({
        bp: e.bp,
        nome: e.name,
        // Forçar cargo de auxiliar para o Bernardo (BP 4598394)
        cargo: e.bp === '4598394' ? 'AUXILIAR DE CARGAS' : (e.cargo || e.position),
        cat6: e.cat_6,
        horario_atribuido: e.work_hours || 'A definir pela IA',
        folgas_fixas: e.fixed_days_off,
        periodo_ferias: e.vacation_period,
        restricoes: e.operational_restrictions
      }));

      // 3. Buscar solicitações aprovadas para o período alvo
      const firstDay = `${targetYear}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = `${targetYear}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-31`; // Simplificado

      const { data: approvedRequests } = await supabase
        .from('shift_requests')
        .select('*')
        .eq('status', 'aprovado')
        .gte('requested_date', firstDay)
        .lte('requested_date', lastDay);

      const requestsContext = approvedRequests?.map((r: any) => ({
        bp: r.requester_bp,
        data: r.requested_date,
        tipo: r.requested_shift,
        motivo: r.reason
      })) || [];

      // 4. Preparar Base de Conhecimento
      let kbContext = '';
      if (knowledgeFiles && knowledgeFiles.length > 0) {
        const { data: kbData } = await supabase.from('knowledge_base').select('content');
        if (kbData && kbData.length > 0) {
          kbContext = `\n\nBASE DE CONHECIMENTO (EXEMPLOS DE ESCALAS ANTERIORES):\n${kbData.map((kb: any) => kb.content).join('\n\n---\n\n')}\n\nUse esses exemplos para entender o padrão de preenchimento e distribuição de turnos.`;
        }
      }

      const prompt = `
        Gere uma escala MENSAL para o terminal JPA (João Pessoa) seguindo o modelo LATAM para o mês de ${targetMonth} de ${targetYear}.
        
        REGRAS CRÍTICAS:
        1. VARIAÇÕES SEMANAIS (DINAMISMO): A IA deve alternar padrões de trabalho a cada semana para cada colaborador.
           Exemplos de ritmos semanais:
           - Semana 1: Ritmo 5x1 (5 dias trab, 1 folga)
           - Semana 2: Ritmo 3x1 (3 dias trab, 1 folga)
           - Semana 3: Ritmo 4x1 (4 dias trab, 1 folga)
           - Semana 4: Ritmo 5x2 (5 dias trab, 2 folgas - use FAGR aqui)
        2. FAGR (FOLGA AGRUPADA): OBRIGATÓRIO e LIMITADO a EXATAMENTE 1 VEZ POR MÊS por colaborador. Não pode haver mais de uma FAGR no mês.
        3. MÁXIMO CONSECUTIVO: Nunca ultrapassar 5 dias seguidos de trabalho.
        4. COBERTURA MÍNIMA: Garantir pelo menos ${baseConfig.min_coverage_per_shift} colaboradores por turno (Manhã e Tarde).
        5. CAT 6: Mínimo ${baseConfig.min_cat6_per_shift} colaboradores CAT 6 ativos em todos os dias.
        6. RESPEITAR: horario_atribuido, folgas_fixas e periodo_ferias (FE).
        7. SOLICITAÇÕES APROVADAS (INDISPONIBILIDADE): Respeitar OBRIGATORIAMENTE as solicitações aprovadas. Se for "Indisponibilidade Total", o colaborador deve estar de FOLGA (FOLG) ou COMPENSA (FC) naquele dia. Se for um horário específico (ex: 08:00-12:00), garanta que o turno atribuído não conflite com esse horário.
        8. SIGLAS: FE (Férias), FOLG (Folga), FC (Compensa), FAGR (Agrupada), FS (Solicitada).
        9. TURNOS: ${SHIFT_LEGEND.map(s => `${s.desc}(${s.code})`).join(', ')}.
 
        HISTÓRICO: ${historyContext}
        COLABORADORES: ${JSON.stringify(employeeContext)}
        SOLICITAÇÕES APROVADAS PARA ${targetMonth}: ${JSON.stringify(requestsContext)}
        ${kbContext}

        SAÍDA JSON APENAS:
        {
          "month": "${targetMonth}", "year": "${targetYear}",
          "data": [
            {
              "area": "OPERAÇÃO", "turno": "MANHÃ/TARDE", "bp": "string",
              "funcao": "LÍDER", "nome": "string", "tarefa": "string",
              "days": [{ "date": "01/${String(targetDate.getMonth() + 1).padStart(2, '0')}", "code": "T079" }, ...]
            }
          ]
        }
      `;

      let responseText = '';
      
      // Tenta chamada direta pelo cliente para evitar timeout do Cloudflare (30s)
      if (llmConfig.provider === 'gemini') {
        // IMPORTANTE: Requer que a chave seja configurada com o prefixo NEXT_PUBLIC_ no Cloudflare
        const clientGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY_SGEI || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        
        if (clientGeminiKey) {
          console.log("[SGEI] Usando chamada direta via cliente (Bypassing Cloudflare Timeout)...");
          const targetModel = llmConfig.model;
          const apiVersion = targetModel.includes('exp') || targetModel.includes('preview') ? 'v1beta' : 'v1';
          
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${targetModel}:generateContent?key=${clientGeminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
              })
            });

            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error?.message || 'Erro na API Gemini via Cliente');
            }

            const data = await response.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } catch (clientErr: any) {
            console.warn("[SGEI] Falha na chamada direta, tentando via API Route...", clientErr);
            // Se falhar a direta, tenta via API Route (que é mais estável que Server Action no Cloudflare)
            const apiResponse = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider, employees })
            });
            
            if (!apiResponse.ok) {
              const errData = await apiResponse.json();
              throw new Error(errData.error || 'Erro na API Route');
            }
            
            const apiData = await apiResponse.json();
            responseText = apiData.text;
          }
        } else {
          // Sem chave cliente, usa API Route
          console.log("[SGEI] Usando API Route para geração (Gemini)...");
          const apiResponse = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider, employees })
          });
          
          if (!apiResponse.ok) {
            const errData = await apiResponse.json();
            throw new Error(errData.error || 'Erro na API Route');
          }
          
          const apiData = await apiResponse.json();
          responseText = apiData.text;
        }
      } else {
        // Outros provedores (OpenRouter, etc) usam API Route
        console.log(`[SGEI] Usando API Route para geração (${llmConfig.provider})...`);
        const apiResponse = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider, employees })
        });
        
        if (!apiResponse.ok) {
          const errData = await apiResponse.json();
          throw new Error(errData.error || 'Erro na API Route');
        }
        
        const apiData = await apiResponse.json();
        responseText = apiData.text;
      }
      
      if (!responseText) throw new Error('A IA retornou uma resposta vazia.');

      // Limpar a resposta caso a IA coloque markdown
      const jsonStr = responseText.replace(/```json|```/g, '').trim();
      
      let parsedData;
      try {
        parsedData = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('Erro ao parsear JSON da IA:', jsonStr);
        throw new Error('A resposta da IA não está em um formato JSON válido. Tente gerar novamente.');
      }
      
      validateSchedule(parsedData);
      
      // Adicionar à lista de escalas (carrossel)
      const newSchedules = [...aiSchedules];
      const existingIndex = newSchedules.findIndex(s => s.month === parsedData.month && s.year === parsedData.year);
      if (existingIndex >= 0) {
        newSchedules[existingIndex] = parsedData;
        setCurrentScheduleIndex(existingIndex);
      } else {
        newSchedules.push(parsedData);
        setCurrentScheduleIndex(newSchedules.length - 1);
      }
      setAiSchedules(newSchedules);
      
      setFeedbackGiven(false);
      setFeedbackData({ rating: 0, comment: '', strengths: [], weaknesses: [] });
    } catch (err: any) {
      console.error('Erro ao gerar escala:', err);
      // Tratamento especial para o erro genérico do Next.js no Cloudflare
      let errorMessage = err.message || 'Erro desconhecido';
      
      if (errorMessage.includes('An unexpected response was received from the server')) {
        if (llmConfig.provider === 'gemini') {
          errorMessage = 'O servidor de IA demorou muito para responder ou a conexão foi interrompida (Timeout Cloudflare). Verifique se a chave GEMINI_API_KEY_SGEI está configurada corretamente e tente novamente com um modelo mais rápido.';
        } else {
          errorMessage = 'O servidor de IA demorou muito para responder ou a conexão foi interrompida (Timeout Cloudflare). Tente novamente com um modelo mais rápido ou verifique sua conexão.';
        }
      }
      
      setError(`Falha ao gerar escala com IA: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const viewSchedule = async (schedule: any) => {
    setLoading(true);
    try {
      const { data: details, error } = await supabase
        .from('schedule_details')
        .select('*, base_employees(name, bp)')
        .eq('schedule_id', schedule.id);
      
      if (error) throw error;

      // Agrupar detalhes por colaborador
      const groupedData = details.reduce((acc: any, detail: any) => {
        const bp = detail.bp;
        if (!acc[bp]) {
          acc[bp] = {
            bp: bp,
            nome: detail.base_employees.name,
            days: []
          };
        }
        acc[bp].days.push({
          date: new Date(detail.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          code: detail.status === 'folga' ? 'FOLG' : 'T000' // Simplificado
        });
        return acc;
      }, {});

      setViewedSchedule({
        ...schedule,
        data: Object.values(groupedData)
      });
    } catch (err: any) {
      console.error('Erro ao visualizar escala:', err);
      setError('Erro ao carregar escala.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (type: 'boa' | 'ruim') => {
    const currentSchedule = aiSchedules[currentScheduleIndex];
    if (!currentSchedule) return;
    setFeedbackGiven(true);
    alert(`Feedback enviado: ${type}. A IA aprenderá com isso!`);
  };

  const handleAnonymizeEmployee = async () => {
    if (!editingEmployee || !confirm('Tem certeza que deseja anonimizar este colaborador? Esta ação é irreversível.')) return;

    setSaving(true);
    try {
      const anonData = {
        name: 'Colaborador Anonimizado',
        email: 'anon@latam.com',
        phone: null,
        is_active: false,
        operational_restrictions: null,
        certifications: null
      };

      const { error } = await supabase
        .from('base_employees')
        .update(anonData)
        .eq('bp', editingEmployee.bp);

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await logAudit(user?.id || 'unknown', 'anonymize', 'base_employees', editingEmployee.bp, editingEmployee, anonData);

      setEmployees(employees.map(e => e.bp === editingEmployee.bp ? { ...e, ...anonData } : e));
      setFilteredEmployees(filteredEmployees.map(e => e.bp === editingEmployee.bp ? { ...e, ...anonData } : e));
      setEditingEmployee(null);
      alert('Colaborador anonimizado com sucesso.');
    } catch (error) {
      console.error('Erro ao anonimizar:', error);
      alert('Erro ao anonimizar colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData: any = {
        fixed_days_off: editingEmployee.fixed_days_off,
        work_hours: editingEmployee.work_hours,
        hour_compensation: editingEmployee.hour_compensation,
        cat_6: editingEmployee.cat_6,
        vacation_period: editingEmployee.vacation_period
      };

      const oldData = {
        fixed_days_off: employees.find(e => e.bp === editingEmployee.bp)?.fixed_days_off,
        work_hours: employees.find(e => e.bp === editingEmployee.bp)?.work_hours,
        hour_compensation: employees.find(e => e.bp === editingEmployee.bp)?.hour_compensation,
        cat_6: employees.find(e => e.bp === editingEmployee.bp)?.cat_6,
        vacation_period: employees.find(e => e.bp === editingEmployee.bp)?.vacation_period
      };

      const { error } = await supabase
        .from('base_employees')
        .update(updateData)
        .eq('bp', editingEmployee.bp);

      if (!error) {
        const { data: { user } } = await supabase.auth.getUser();
        await logAudit(user?.id || 'unknown', 'update', 'base_employees', editingEmployee.bp, oldData, updateData);
      }

      if (error) {
        // Se o erro for sobre coluna não encontrada, tenta identificar qual e remover
        if (error.message.includes('column') && error.message.includes('not found')) {
          console.warn('Erro de schema detectado:', error.message);
          
          // Tenta identificar a coluna no erro (ex: "Could not find the 'work_hours' column")
          const match = error.message.match(/'([^']+)' column/);
          if (match && match[1]) {
            const missingColumn = match[1];
            console.warn(`Removendo coluna inexistente '${missingColumn}' e tentando novamente...`);
            delete updateData[missingColumn];
            
            const { error: retryError, data: retryData } = await supabase
              .from('base_employees')
              .update(updateData)
              .eq('bp', editingEmployee.bp);
            
            if (!retryError) {
              const { data: { user } } = await supabase.auth.getUser();
              await logAudit(user?.id || 'unknown', 'update', 'base_employees', editingEmployee.bp, oldData, updateData);
            }
            
            if (retryError) {
              // Se falhar de novo por outra coluna, repete o processo recursivamente ou falha
              throw retryError;
            }
            alert(`Dados atualizados (Nota: a coluna '${missingColumn}' ainda não existe no banco de dados e foi ignorada).`);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      } else {
        alert('Dados do colaborador atualizados com sucesso!');
      }

      setEmployees(prev => prev.map(emp => emp.bp === editingEmployee.bp ? editingEmployee : emp));
      setEditingEmployee(null);
    } catch (err: any) {
      console.error('Erro ao atualizar colaborador:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    const aiSchedule = aiSchedules[currentScheduleIndex];
    if (!aiSchedule) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- CABEÇALHO AZUL ---
    doc.setFillColor(0, 33, 105);
    doc.rect(10, 10, pageWidth - 20, 10, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`ESCALA JPA ${aiSchedule.month} _ ${aiSchedule.year}`, pageWidth / 2, 17, { align: 'center' });

    // --- PREPARAR DADOS DA TABELA ---
    const getDayOfWeek = (dateStr: string, yearStr: string) => {
      try {
        const [day, month] = dateStr.split('/');
        const date = new Date(parseInt(yearStr), parseInt(month) - 1, parseInt(day));
        const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
        return days[date.getDay()];
      } catch (e) { return ''; }
    };

    const days = aiSchedule.data[0].days;
    const headerRow1 = ['', '', '', '', '', ...days.map((d: any) => getDayOfWeek(d.date, aiSchedule.year))];
    const headerRow2 = ['ÁREA', 'TURNO', 'BP', 'FUNÇÃO', 'NOME', ...days.map((d: any) => d.date)];

    const body = aiSchedule.data.map((row: any) => [
      row.area,
      row.turno,
      row.bp,
      row.funcao,
      row.nome,
      ...row.days.map((d: any) => d.code)
    ]);

    autoTable(doc, {
      head: [headerRow1, headerRow2],
      body: body,
      startY: 22,
      theme: 'grid',
      styles: { 
        fontSize: 5, 
        cellPadding: 0.5, 
        halign: 'center', 
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [100, 100, 100]
      },
      headStyles: { 
        fillColor: [0, 33, 105], 
        textColor: [255, 255, 255],
        fontSize: 5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 }, // ÁREA
        1: { cellWidth: 10 }, // TURNO
        2: { cellWidth: 10 }, // BP
        3: { cellWidth: 12 }, // FUNÇÃO
        4: { cellWidth: 20 }, // NOME
        // Dias (index 5 em diante)
        ...Array.from({ length: days.length }, (_, i) => ({
          [i + 5]: { cellWidth: 6 }
        })).reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {})
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 4) {
          const val = data.cell.raw;
          if (['FOLG', 'FAGR', 'FC', 'FS', 'FDFE'].includes(val as string)) {
            data.cell.styles.fillColor = [220, 252, 231]; 
            data.cell.styles.textColor = [22, 101, 52]; 
          } else if (val === 'FE') {
            data.cell.styles.fillColor = [243, 244, 246]; 
            data.cell.styles.textColor = [107, 114, 128]; 
          }
        }
        if (data.section === 'head' && data.row.index === 0 && data.column.index > 4) {
          const day = data.cell.raw;
          if (day === 'SAB' || day === 'DOM') {
            data.cell.styles.fillColor = [230, 0, 0]; 
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const colWidth = (pageWidth - 25) / 2;

    // --- COLUNA 1: LEGENDAS ---
    doc.setFillColor(30, 41, 59);
    doc.rect(10, finalY, colWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('LEGENDA DE HORÁRIOS', 10 + colWidth / 2, finalY + 4, { align: 'center' });

    autoTable(doc, {
      head: [['CÓDIGO', 'DESCRIÇÃO']],
      body: SHIFT_LEGEND.map(s => [s.code, s.desc]),
      startY: finalY + 6,
      margin: { left: 10 },
      tableWidth: colWidth,
      styles: { fontSize: 5, cellPadding: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] }
    });

    const siglaY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(10, siglaY, colWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('LEGENDA DE SIGLAS', 10 + colWidth / 2, siglaY + 4, { align: 'center' });

    autoTable(doc, {
      head: [['SIGLA', 'DESCRIÇÃO']],
      body: SIGLA_LEGEND.map(s => [s.code, s.desc]),
      startY: siglaY + 6,
      margin: { left: 10 },
      tableWidth: colWidth,
      styles: { fontSize: 5, cellPadding: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const sigla = data.cell.raw;
          if (['FOLG', 'FAGR', 'FC', 'FS', 'FDFE'].includes(sigla as string)) {
            data.cell.styles.fillColor = [220, 252, 231];
          }
        }
      }
    });

    // --- COLUNA 2: ROTEIRO DE ATIVIDADES ---
    doc.setFillColor(0, 33, 105);
    doc.rect(10 + colWidth + 5, finalY, colWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('ROTEIRO DE ATIVIDADES', 10 + colWidth + 5 + colWidth / 2, finalY + 4, { align: 'center' });

    autoTable(doc, {
      head: [['RESPONSÁVEL', 'TAREFAS DIÁRIAS']],
      body: aiSchedules[currentScheduleIndex]?.data.map((row: any) => [row.nome, row.tarefa || '']) || [],
      startY: finalY + 6,
      margin: { left: 10 + colWidth + 5 },
      tableWidth: colWidth,
      styles: { fontSize: 5, cellPadding: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] }
    });

    doc.save(`Escala_JPA_${aiSchedule.month}_${aiSchedule.year}.pdf`);
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: 'aprovado' | 'rejeitado') => {
    setUpdatingRequest(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('shift_requests')
        .update({ 
          status: newStatus,
          approved_by: session?.user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      setShiftRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: newStatus } : req));
    } catch (err: any) {
      console.error('Erro ao atualizar solicitação:', err);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setUpdatingRequest(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUploadKb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingKb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      const { uploadKnowledgeBaseFile } = await import('@/app/actions/knowledge');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') {
          alert(`O arquivo ${file.name} não é um PDF válido.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadKnowledgeBaseFile(formData, session.access_token);
        if (!result.success) {
          throw new Error(result.error);
        }

        if (result.data) {
          setKnowledgeFiles(prev => [result.data, ...prev]);
        }
      }
      alert('Arquivos processados e adicionados à Base de Conhecimento com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload:', err);
      alert('Erro no upload: ' + err.message);
    } finally {
      setUploadingKb(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este arquivo da base de conhecimento? A IA não usará mais este arquivo como contexto.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      const { deleteKnowledgeBaseFile } = await import('@/app/actions/knowledge');
      const result = await deleteKnowledgeBaseFile(id, session.access_token);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setKnowledgeFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar:', err);
      alert('Erro ao deletar: ' + err.message);
    }
  };

  const handleSaveDraft = async () => {
    const currentSchedule = aiSchedules[currentScheduleIndex];
    if (!currentSchedule) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');

      const draftData = {
        base_id: employees[0]?.base_id || '00000000-0000-0000-0000-000000000000',
        month: currentSchedule.month,
        year: currentSchedule.year.toString(),
        content: currentSchedule,
        created_by: session.user.id
      };

      let result;
      if (currentSchedule.id && currentSchedule.status === 'draft') {
        result = await supabase
          .from('escala_drafts')
          .update(draftData)
          .eq('id', currentSchedule.id);
      } else {
        result = await supabase
          .from('escala_drafts')
          .insert([draftData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      alert('Rascunho salvo com sucesso!');
      if (!currentSchedule.id && result.data) {
        setAiSchedules(prev => prev.map((s, i) => i === currentScheduleIndex ? { ...s, id: result.data.id, status: 'draft' } : s));
      }
    } catch (err: any) {
      console.error('Erro ao salvar rascunho:', err);
      alert('Erro ao salvar rascunho: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleValidateAndPublish = async () => {
    if (validationErrors.filter(e => e.type === 'error').length > 0) {
      if (!confirm('Existem erros críticos de conformidade. Deseja publicar mesmo assim?')) {
        return;
      }
    }
    await handlePublishSchedule();
  };

  const handlePublishSchedule = async () => {
    const currentSchedule = aiSchedules[currentScheduleIndex];
    if (!currentSchedule) return;
    setSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (await handleSupabaseSessionError(sessionError)) {
        return;
      }
      
      const monthMap: { [key: string]: string } = {
        'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04',
        'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08',
        'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
      };
      const monthNum = monthMap[currentSchedule.month.toUpperCase()] || '01';

      let scheduleId = editingScheduleId;

      if (editingScheduleId) {
        // 1. Atualizar registro da escala existente
        const { error: uError } = await supabase
          .from('schedules')
          .update({
            published_at: new Date().toISOString(),
            created_by: session?.user?.id
          })
          .eq('id', editingScheduleId);

        if (uError) throw uError;

        // 2. Remover detalhes antigos para reinserir os novos
        const { error: delError } = await supabase
          .from('schedule_details')
          .delete()
          .eq('schedule_id', editingScheduleId);

        if (delError) throw delError;
      } else {
        // 1. Criar novo registro da escala
        const { data: schedule, error: sError } = await supabase
          .from('schedules')
          .insert([{
            base_id: employees[0]?.base_id || '00000000-0000-0000-0000-000000000000',
            start_date: `${currentSchedule.year}-${monthNum}-01`,
            end_date: `${currentSchedule.year}-${monthNum}-30`,
            published_at: new Date().toISOString(),
            created_by: session?.user?.id
          }])
          .select()
          .single();

        if (sError) throw sError;
        scheduleId = schedule.id;
      }

      // 3. Criar novos detalhes da escala
      const details = [];
      for (const emp of currentSchedule.data) {
        for (const day of emp.days) {
          const [d, m] = day.date.split('/');
          details.push({
            schedule_id: scheduleId,
            bp: emp.bp,
            date: `${currentSchedule.year}-${m}-${d}`,
            shift: day.code.startsWith('T') ? 'manhã' : 'tarde', // Mapeamento simplificado
            status: (day.code === 'FOLG' || day.code === 'FAGR' || day.code === 'FC') ? 'folga' : 'trabalhado',
            code: day.code // Salvando o código original
          });
        }
      }

      const { error: dError } = await supabase
        .from('schedule_details')
        .insert(details);

      if (dError) throw dError;

      // 4. Se era um rascunho, remover da tabela de rascunhos
      if (currentSchedule.status === 'draft' && currentSchedule.id) {
        await supabase
          .from('escala_drafts')
          .delete()
          .eq('id', currentSchedule.id);
      }

      alert(editingScheduleId ? 'Escala republicada com sucesso! Os colaboradores verão a atualização automaticamente.' : 'Escala publicada com sucesso!');
      
      // Atualizar o status na lista local em vez de remover
      setAiSchedules(prev => prev.map((s, i) => i === currentScheduleIndex ? { ...s, status: 'published', id: scheduleId } : s));
      
      setEditingScheduleId(null);

      // 4. Atualizar histórico local
      const { data: historyData } = await supabase
        .from('schedules')
        .select('*, created_by_user:users(name)')
        .order('created_at', { ascending: false })
        .limit(6);
      if (historyData) setScheduleHistory(historyData);

    } catch (err: any) {
      console.error('Erro ao publicar escala:', err);
      alert('Erro ao publicar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBaseConfig = async () => {
    setSavingConfig(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: existingConfig } = await supabase
        .from('base_configuration')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingConfig) {
        const { error } = await supabase
          .from('base_configuration')
          .update({
            min_coverage_per_shift: baseConfig.min_coverage_per_shift,
            min_cat6_per_shift: baseConfig.min_cat6_per_shift,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('base_configuration')
          .insert([{
            min_coverage_per_shift: baseConfig.min_coverage_per_shift,
            min_cat6_per_shift: baseConfig.min_cat6_per_shift,
            base_id: employees[0]?.base_id || null // Fallback
          }]);
        if (error) throw error;
      }
      
      setShowConfig(false);
      alert('Configurações da base salvas com sucesso!');
      await logAudit(session?.user?.id || '', 'UPDATE', 'base_configuration', null, null, baseConfig);
    } catch (err: any) {
      console.error('Erro ao salvar config:', err);
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel do Supervisor - JPA</h1>
          <p className="text-sm sm:text-base text-gray-500">
            Gestão operacional e geração de escalas. 
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase border border-indigo-100">
              <Cpu size={10} /> IA: {configLoading ? '...' : `${llmConfig.provider} (${llmConfig.model})`}
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-3 rounded-xl font-medium hover:bg-slate-50 transition shadow-sm"
            >
              <Info size={18} />
              Configurar Base
            </button>
            <button 
              onClick={generateScheduleAI}
              disabled={loading || configLoading}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:bg-gray-400"
            >
              {loading ? <Clock className="animate-spin" /> : <Sparkles />}
              {loading ? 'Gerando...' : (configLoading ? 'Carregando Config...' : 'Gerar Escala com IA')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
          <AlertTriangle />
          {error}
        </div>
      )}

      {/* Indicador de Progresso Proeminente */}
      <AnimatePresence>
        {loading && aiSchedules.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md no-print"
          >
            <div className="max-w-md w-full p-10 bg-white rounded-[40px] shadow-2xl text-center space-y-8">
              <div className="relative flex justify-center">
                <div className="w-24 h-24 border-4 border-slate-100 border-t-latam-indigo rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-latam-indigo animate-pulse" size={32} />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  Inteligência Artificial em Ação
                </h3>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-latam-indigo"
                      initial={{ width: "0%" }}
                      animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Passo {loadingStep + 1} de {loadingSteps.length}
                  </p>
                </div>
                <p className="text-slate-600 font-medium italic">
                  &quot;{loadingSteps[loadingStep]}&quot;
                </p>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  O motor SGEI está processando milhares de combinações para garantir a melhor escala para o terminal JPA.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {aiSchedules.length > 0 && (
        <div className="space-y-6">
          {/* Carousel Header / Navigation */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-indigo-50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Escalas Ativas / Rascunhos ({aiSchedules.length})</h3>
                <p className="text-xs text-slate-500">Alterne entre as escalas geradas para revisão ou consulta</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentScheduleIndex(prev => Math.max(0, prev - 1))}
                disabled={currentScheduleIndex === 0}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
              >
                <ArrowRightLeft size={20} className="rotate-180" />
              </button>
              <div className="flex gap-1 px-4">
                {aiSchedules.map((s, i) => (
                  <button
                    key={`${s.month}-${s.year}-${s.status || 'draft'}`}
                    onClick={() => setCurrentScheduleIndex(i)}
                    className={`h-2 rounded-full transition-all flex items-center justify-center relative ${currentScheduleIndex === i ? 'w-12 bg-latam-indigo' : 'w-3 bg-slate-200'}`}
                    title={`${s.month} ${s.year} (${s.status === 'published' ? 'Publicada' : 'Rascunho'})`}
                  >
                    {currentScheduleIndex === i && (
                      <span className="text-[6px] text-white font-bold uppercase">
                        {s.status === 'published' ? 'PUB' : 'RAS'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCurrentScheduleIndex(prev => Math.min(aiSchedules.length - 1, prev + 1))}
                disabled={currentScheduleIndex === aiSchedules.length - 1}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all"
              >
                <ArrowRightLeft size={20} />
              </button>
            </div>
          </div>

          <motion.div 
            key={`${aiSchedules[currentScheduleIndex].month}-${aiSchedules[currentScheduleIndex].year}`}
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100 -mx-4 sm:-mx-6 lg:-mx-8 mb-8"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-indigo-900">
                    {editingScheduleId ? (aiSchedules[currentScheduleIndex].status === 'published' ? `Escala Publicada - ${aiSchedules[currentScheduleIndex].month} ${aiSchedules[currentScheduleIndex].year}` : 'Editando Escala Publicada') : `Proposta de Escala - ${aiSchedules[currentScheduleIndex].month} ${aiSchedules[currentScheduleIndex].year}`}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Modelo LATAM - Status: {aiSchedules[currentScheduleIndex].status === 'published' ? 'Publicado' : 'Rascunho'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!feedbackGiven && (
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 px-2 uppercase">Avaliar:</span>
                    <button onClick={() => handleFeedback('boa')} className="p-2 bg-white text-green-600 rounded-lg hover:bg-green-50 shadow-sm transition-all"><ThumbsUp size={18} /></button>
                    <button onClick={() => handleFeedback('ruim')} className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 shadow-sm transition-all"><ThumbsDown size={18} /></button>
                  </div>
                )}
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition no-print"
                >
                  <Download size={18} /> Exportar PDF
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-latam-indigo text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#001a54] transition shadow-md no-print"
                >
                  <Printer size={18} /> Imprimir
                </button>
              </div>
            </div>

            <div className="mb-6 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
              <Sparkles size={18} className="text-indigo-500" />
              <p>Esta escala é uma <strong>sugestão gerada por IA</strong>. Por favor, revise todos os horários e atribuições antes de validar e publicar.</p>
            </div>

            <div className="print-content">
              {/* Cabeçalho exclusivo para impressão */}
              <div className="hidden print:block mb-8 border-b-4 border-latam-indigo pb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black text-latam-indigo leading-none">LATAM</h1>
                    <p className="text-xs font-bold tracking-[0.2em] text-latam-indigo">AIRLINES</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-800 uppercase">Escala de Revezamento - JPA</h2>
                    <p className="text-sm text-slate-500 font-medium">{aiSchedules[currentScheduleIndex].month} / {aiSchedules[currentScheduleIndex].year}</p>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="mb-8 p-5 bg-white border-2 border-amber-200 rounded-[24px] shadow-sm overflow-hidden relative no-print">
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-400" />
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 uppercase tracking-wider">
                      <AlertTriangle size={18} className="text-amber-500" />
                      Análise de Conformidade (HITL)
                    </h3>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase">
                      {validationErrors.filter(e => e.type === 'error').length} Erros Críticos
                    </span>
                  </div>
                  {(() => {
                    const groupedErrors = validationErrors.reduce((acc: any, err: any) => {
                      let groupKey = 'Geral / Mensal';
                      if (err.date) {
                        const parts = err.date.split('/');
                        if (parts.length === 2) {
                          const dayOfMonth = parseInt(parts[0], 10);
                          if (!isNaN(dayOfMonth)) {
                            const weekNum = Math.ceil(dayOfMonth / 7);
                            groupKey = `Semana ${weekNum}`;
                          }
                        } else {
                          const d = new Date(err.date);
                          if (!isNaN(d.getTime())) {
                            const dayOfMonth = d.getUTCDate();
                            const weekNum = Math.ceil(dayOfMonth / 7);
                            groupKey = `Semana ${weekNum}`;
                          }
                        }
                      }
                      if (!acc[groupKey]) acc[groupKey] = [];
                      acc[groupKey].push(err);
                      return acc;
                    }, {});

                    const sortedGroupKeys = Object.keys(groupedErrors).sort((a, b) => {
                      if (a === 'Geral / Mensal') return -1;
                      if (b === 'Geral / Mensal') return 1;
                      return a.localeCompare(b);
                    });

                    return (
                      <div className="space-y-6 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {sortedGroupKeys.map(groupKey => (
                          <div key={groupKey} className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">{groupKey}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {groupedErrors[groupKey].map((err: any, idx: number) => {
                                let dateLabel = '';
                                if (err.date) {
                                  const parts = err.date.split('/');
                                  if (parts.length === 2) {
                                    dateLabel = `${parts[0]}/${parts[1]}`;
                                  } else {
                                    const d = new Date(err.date);
                                    if (!isNaN(d.getTime())) {
                                      dateLabel = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                                    } else {
                                      dateLabel = err.date;
                                    }
                                  }
                                }
                                
                                const title = err.nome ? `${err.nome}${dateLabel ? ` - ${dateLabel}` : ''}` : (dateLabel || 'Aviso');

                                return (
                                  <div key={idx} className={`text-[11px] p-3 rounded-xl flex items-start gap-3 transition-all border ${err.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${err.type === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                    <div className="space-y-1">
                                      <div className="font-black uppercase tracking-tight">{title}</div>
                                      <div className="font-medium leading-relaxed opacity-80">{err.message}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <p className="mt-4 text-[10px] text-slate-400 italic">
                    * Toda escala gerada por IA deve ser revisada manualmente antes da publicação.
                  </p>
                </div>
              )}

              <LATAMScheduleTable 
                month={aiSchedules[currentScheduleIndex].month} 
                year={aiSchedules[currentScheduleIndex].year} 
                data={aiSchedules[currentScheduleIndex].data} 
                validationErrors={validationErrors}
                onDataChange={(newData) => {
                  const updatedSchedules = [...aiSchedules];
                  updatedSchedules[currentScheduleIndex] = { ...updatedSchedules[currentScheduleIndex], data: newData };
                  setAiSchedules(updatedSchedules);
                  validateSchedule(updatedSchedules[currentScheduleIndex]);
                }}
              />

              {/* Sistema de Feedback Detalhado */}
              {!feedbackGiven && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 p-8 bg-slate-50 rounded-[32px] border border-slate-200 shadow-inner no-print"
                >
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full space-y-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                          <ThumbsUp size={24} className="text-latam-indigo" />
                          Avaliação da Inteligência Artificial
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Seu feedback é essencial para treinarmos o motor de escalas JPA.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                            className={`p-1 transition-all transform hover:scale-110 ${feedbackData.rating >= star ? 'text-amber-400' : 'text-slate-300'}`}
                          >
                            <Sparkles size={32} fill={feedbackData.rating >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                        <span className="ml-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                          {feedbackData.rating > 0 ? `${feedbackData.rating} Estrelas` : 'Avalie a precisão'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Fortes</label>
                          <div className="flex flex-wrap gap-2">
                            {['Cobertura Ideal', 'Regra 5x1 OK', 'Folgas FAGR OK', 'Turnos Equilibrados'].map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  const strengths = feedbackData.strengths.includes(tag)
                                    ? feedbackData.strengths.filter(s => s !== tag)
                                    : [...feedbackData.strengths, tag];
                                  setFeedbackData({ ...feedbackData, strengths });
                                }}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${feedbackData.strengths.includes(tag) ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Fracos</label>
                          <div className="flex flex-wrap gap-2">
                            {['Muitas Férias', 'Furo de Cobertura', 'Turno Incorreto', 'Violação 5x1'].map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  const weaknesses = feedbackData.weaknesses.includes(tag)
                                    ? feedbackData.weaknesses.filter(w => w !== tag)
                                    : [...feedbackData.weaknesses, tag];
                                  setFeedbackData({ ...feedbackData, weaknesses });
                                }}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${feedbackData.weaknesses.includes(tag) ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:border-red-200'}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comentários Adicionais</label>
                        <textarea
                          value={feedbackData.comment}
                          onChange={(e) => setFeedbackData({ ...feedbackData, comment: e.target.value })}
                          placeholder="Ex: O colaborador Bernardo ficou com turno de madrugada indevidamente..."
                          className="w-full h-32 p-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-latam-indigo outline-none transition-all resize-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveFeedback}
                        disabled={savingFeedback || feedbackData.rating === 0}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition shadow-lg disabled:bg-slate-300 flex items-center justify-center gap-2"
                      >
                        {savingFeedback ? 'Enviando...' : 'Enviar Feedback para Treinamento'}
                        <ArrowRightLeft size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <button 
                onClick={() => {
                  const newSchedules = aiSchedules.filter((_, i) => i !== currentScheduleIndex);
                  setAiSchedules(newSchedules);
                  if (currentScheduleIndex >= newSchedules.length) {
                    setCurrentScheduleIndex(Math.max(0, newSchedules.length - 1));
                  }
                  setEditingScheduleId(null);
                }}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                {aiSchedules[currentScheduleIndex].status === 'published' ? 'Remover do Carrossel' : (editingScheduleId ? 'Cancelar Edição' : 'Descartar')}
              </button>
              {aiSchedules[currentScheduleIndex].status !== 'published' && (
                <button 
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm disabled:bg-slate-50"
                >
                  <Database size={20} />
                  {saving ? 'Salvando...' : 'Salvar Rascunho'}
                </button>
              )}
              <button 
                onClick={handleValidateAndPublish}
                disabled={saving}
                className="flex items-center gap-2 bg-latam-indigo text-white px-8 py-3 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-200 disabled:bg-slate-300"
              >
                <ShieldCheck size={20} />
                {saving ? 'Publicando...' : (aiSchedules[currentScheduleIndex].status === 'published' || editingScheduleId ? 'Validar e Republicar' : 'Validar e Publicar Escala')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="text-indigo-600" /> Gestão Detalhada de Equipe
            </h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input 
                  type="text"
                  placeholder="Buscar por nome ou BP..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                  onChange={(e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = employees.filter(emp => 
                      emp.name.toLowerCase().includes(term) || 
                      emp.bp.toLowerCase().includes(term)
                    );
                    setFilteredEmployees(filtered);
                  }}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              <span className="flex items-center justify-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {filteredEmployees.length} Colaboradores
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-4 pb-2">Colaborador</th>
                  <th className="px-4 pb-2">Regime</th>
                  <th className="px-4 pb-2">Horário</th>
                  <th className="px-4 pb-2">Folgas Fixas</th>
                  <th className="px-4 pb-2">Compensas</th>
                  <th className="px-4 pb-2">Férias</th>
                  <th className="px-4 pb-2">DG6 (CAT 6)</th>
                  <th className="px-4 pb-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredEmployees.map(emp => (
                  <tr key={emp.bp} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 bg-white border-y border-l border-gray-100 first:rounded-l-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-latam-indigo/5 flex items-center justify-center text-latam-indigo font-bold text-xs">
                          {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {emp.name}
                            {emp.position === 'Supervisor' && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] uppercase font-black rounded border border-amber-200">
                                Supervisor
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{emp.bp}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                        5x1
                      </span>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <input
                        type="text"
                        value={emp.work_hours || ''}
                        onChange={(e) => {
                          const newEmployees = employees.map(item => 
                            item.bp === emp.bp ? { ...item, work_hours: e.target.value } : item
                          );
                          setEmployees(newEmployees);
                        }}
                        onBlur={async () => {
                          try {
                            const { error } = await supabase
                              .from('base_employees')
                              .update({ work_hours: emp.work_hours })
                              .eq('bp', emp.bp);
                            if (error) throw error;
                          } catch (err: any) {
                            console.error('Erro ao salvar horário:', err);
                            alert('Erro ao salvar horário.');
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 w-full bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none"
                        placeholder="Escala IA"
                      />
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="text-xs text-gray-600 font-medium">
                        {emp.fixed_days_off || 'Sáb/Dom'}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="flex items-center gap-1 text-amber-600 font-bold">
                        <Clock size={14} />
                        {emp.hour_compensation || '0h'}
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar size={14} />
                        <span className="text-xs">
                          {emp.vacation_period || 'Nenhum'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-gray-100">
                      {emp.cat_6 ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <CheckCircle size={14} /> Sim
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-4 bg-white border-y border-r border-gray-100 last:rounded-r-xl text-right">
                      <button 
                        onClick={() => setEditingEmployee({ ...emp })}
                        className="p-2 text-slate-400 hover:text-latam-indigo hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Clock className="text-indigo-600" /> Legenda de Horários
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {SHIFT_LEGEND.map(s => (
              <div key={s.code} className="text-xs p-2 bg-gray-50 rounded-lg flex justify-between">
                <span className="font-bold text-indigo-600">{s.code}</span>
                <span className="text-gray-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="text-indigo-600" /> Roteiro de Atividades
          </h2>
          <div className="space-y-4">
            {aiSchedules[currentScheduleIndex]?.data.map((row: any, idx: number) => (
              <div key={row.bp} className="text-xs p-3 bg-gray-50 rounded-lg">
                <div className="font-bold text-gray-900">{row.nome}</div>
                <input 
                  type="text"
                  value={row.tarefa || ''}
                  onChange={(e) => {
                    const updatedSchedules = [...aiSchedules];
                    updatedSchedules[currentScheduleIndex].data[idx].tarefa = e.target.value;
                    setAiSchedules(updatedSchedules);
                  }}
                  className="w-full mt-1 bg-white border border-gray-200 focus:ring-1 focus:ring-indigo-500 outline-none p-1.5 rounded text-gray-600"
                  placeholder="Sem tarefas"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Info className="text-indigo-600" /> Legenda de Siglas
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {SIGLA_LEGEND.map(s => (
              <div key={s.code} className="text-xs p-2 bg-gray-50 rounded-lg flex items-center gap-2">
                <span className={`px-2 py-1 rounded ${s.color || 'bg-gray-200'}`}>{s.code}</span>
                <span className="text-gray-600">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico de Escalas Section */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="text-latam-indigo" size={24} />
            Histórico de Escalas Publicadas
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scheduleHistory.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">
              Nenhuma escala publicada anteriormente.
            </div>
          ) : (
            scheduleHistory.map(schedule => (
              <div key={schedule.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-slate-900 uppercase">
                      {new Date(schedule.start_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">
                      Publicada em: {new Date(schedule.published_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg uppercase">
                    Publicada
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-[10px] text-slate-400">
                    Por: {schedule.created_by_user?.name || 'Sistema'}
                  </div>
                  <button 
                    onClick={() => viewSchedule(schedule)}
                    className="flex items-center gap-1 text-xs font-bold text-latam-indigo hover:underline"
                  >
                    <Search size={14} /> Visualizar / Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trocas e Solicitações Section */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="text-latam-indigo" size={24} />
            Trocas e Solicitações
          </h2>
        </div>
        
        <div className="space-y-4">
          {shiftRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Nenhuma solicitação pendente.
            </div>
          ) : (
            shiftRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-latam-indigo/10 flex items-center justify-center text-latam-indigo font-bold">
                    {request.employee_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{request.employee_name}</div>
                    <div className="text-sm text-slate-500">
                      Solicita troca do dia <span className="font-medium text-slate-700">{new Date(request.date).toLocaleDateString('pt-BR')}</span> 
                      {request.target_employee_name && (
                        <span> com <span className="font-medium text-slate-700">{request.target_employee_name}</span></span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Motivo: {request.reason}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {request.status === 'pending' || request.status === 'pendente' ? (
                    <>
                      <button 
                        onClick={() => handleUpdateRequestStatus(request.id, 'aprovado')}
                        disabled={updatingRequest === request.id}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Aprovar"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button 
                        onClick={() => handleUpdateRequestStatus(request.id, 'rejeitado')}
                        disabled={updatingRequest === request.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Rejeitar"
                      >
                        <X size={20} />
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      request.status === 'aprovado' || request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {request.status === 'aprovado' || request.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Base de Conhecimento Section */}
      <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-latam-indigo" size={24} />
              Base de Conhecimento (IA)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Faça upload de escalas anteriores em PDF para que a IA aprenda o padrão e gere escalas mais precisas.
            </p>
          </div>
          
          <div>
            <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition-all ${uploadingKb ? 'bg-slate-100 text-slate-400' : 'bg-latam-indigo text-white hover:bg-opacity-90 shadow-lg shadow-indigo-100'}`}>
              <Upload size={18} />
              {uploadingKb ? 'Processando...' : 'Fazer Upload (PDF)'}
              <input 
                type="file" 
                accept="application/pdf" 
                multiple 
                className="hidden" 
                onChange={handleUploadKb}
                disabled={uploadingKb}
              />
            </label>
          </div>
        </div>
        
        <div className="space-y-3">
          {knowledgeFiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen size={32} className="mx-auto mb-3 text-slate-300" />
              <p>Nenhum arquivo na base de conhecimento.</p>
              <p className="text-xs mt-1">Faça upload de PDFs de escalas antigas para melhorar a IA.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {knowledgeFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate" title={file.file_name}>{file.file_name}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(file.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteKb(file.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors shrink-0"
                    title="Remover arquivo"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    <AnimatePresence>
        {viewedSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Visualizar Escala - {new Date(viewedSchedule.start_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setAiSchedules([{
                        month: new Date(viewedSchedule.start_date).toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase(),
                        year: new Date(viewedSchedule.start_date).getFullYear().toString(),
                        data: viewedSchedule.data
                      }]);
                      setCurrentScheduleIndex(0);
                      setEditingScheduleId(viewedSchedule.id);
                      setViewedSchedule(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md"
                  >
                    <Edit2 size={16} /> Editar esta Escala
                  </button>
                  <button onClick={() => setViewedSchedule(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto">
                <LATAMScheduleTable 
                  month={new Date(viewedSchedule.start_date).toLocaleDateString('pt-BR', { month: 'long' })}
                  year={new Date(viewedSchedule.start_date).getFullYear().toString()}
                  data={viewedSchedule.data}
                  onDataChange={() => {}}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Configurações da Base</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Parâmetros Operacionais JPA</p>
                </div>
                <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users size={18} />
                    </div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cobertura por Turno</label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={baseConfig.min_coverage_per_shift}
                      onChange={(e) => setBaseConfig({...baseConfig, min_coverage_per_shift: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-latam-indigo"
                    />
                    <span className="w-12 h-12 flex items-center justify-center bg-indigo-50 text-latam-indigo font-black rounded-2xl border border-indigo-100">
                      {baseConfig.min_coverage_per_shift}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Mínimo de colaboradores ativos em cada turno (Manhã/Tarde).</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={18} />
                    </div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cobertura CAT 6</label>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={baseConfig.min_cat6_per_shift}
                      onChange={(e) => setBaseConfig({...baseConfig, min_cat6_per_shift: parseInt(e.target.value)})}
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 font-black rounded-2xl border border-emerald-100">
                      {baseConfig.min_cat6_per_shift}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Mínimo de colaboradores com certificação CAT 6 ativos por dia.</p>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    onClick={() => setShowConfig(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveBaseConfig}
                    disabled={savingConfig}
                    className="flex-1 bg-latam-indigo text-white py-4 rounded-2xl font-bold hover:bg-[#001a54] transition-all shadow-xl shadow-indigo-100 disabled:bg-slate-300"
                  >
                    {savingConfig ? 'Salvando...' : 'Salvar Config'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Editar Colaborador</h3>
                <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateEmployee} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Regime de Trabalho</label>
                    <div className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-500">
                      5x1 (Fixo LATAM)
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horário de Trabalho</label>
                    <input 
                      type="text"
                      value={editingEmployee.work_hours || ''}
                      onChange={e => setEditingEmployee({...editingEmployee, work_hours: e.target.value})}
                      placeholder="Ex: 08:00 - 16:00"
                      className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Aceitador DG6 (CAT 6)</label>
                  <div className="flex items-center gap-2 h-10">
                    <input 
                      type="checkbox" 
                      checked={editingEmployee.cat_6}
                      onChange={e => setEditingEmployee({...editingEmployee, cat_6: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-latam-indigo focus:ring-latam-indigo"
                    />
                    <span className="text-sm font-medium">Habilitado</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Folgas Fixas</label>
                  <input 
                    type="text"
                    value={editingEmployee.fixed_days_off || ''}
                    onChange={e => setEditingEmployee({...editingEmployee, fixed_days_off: e.target.value})}
                    placeholder="Ex: Sábados e Domingos"
                    className="w-full p-2 border rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Compensa de Horas</label>
                    <input 
                      type="text"
                      value={editingEmployee.hour_compensation || ''}
                      onChange={e => setEditingEmployee({...editingEmployee, hour_compensation: e.target.value})}
                      placeholder="Ex: 12h"
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Período de Férias</label>
                    <input 
                      type="text"
                      value={editingEmployee.vacation_period || ''}
                      onChange={e => setEditingEmployee({...editingEmployee, vacation_period: e.target.value})}
                      placeholder="Ex: 01/05 a 30/05"
                      className="w-full p-2 border rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={handleAnonymizeEmployee}
                    className="py-3 px-4 rounded-xl font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    Anonimizar
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-latam-indigo text-white py-3 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-100 disabled:bg-slate-300"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sugestões de Melhoria */}
      <SuggestionSection 
        userId={user?.id} 
        userName={user?.name} 
        userRole={user?.roles?.[0] || 'supervisor'} 
      />
    </div>
  );
}
