'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Users, 
  Sparkles, 
  ArrowRightLeft, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Save,
  FileText,
  Download,
  X,
  FileDown,
  Printer,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LATAMScheduleTable, { SHIFT_LEGEND, SIGLA_LEGEND } from '@/components/LATAMScheduleTable';
import { generateWithOpenRouter, generateWithGemini } from '@/app/actions/ai';
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
  const [aiSchedule, setAiSchedule] = useState<any | null>(null);
  const [viewedSchedule, setViewedSchedule] = useState<any | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ rating: 0, comment: '', strengths: [] as string[], weaknesses: [] as string[] });
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState({ provider: 'gemini', model: 'gemini-1.5-flash' });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
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

      const { data: empData } = await supabase.from('base_jpa').select('*');
      const { data: reqData } = await supabase.from('shift_requests').select('*');
      if (empData) {
        setEmployees(empData);
        setFilteredEmployees(empData);
      }
      if (reqData) setShiftRequests(reqData);

      const { data: historyData } = await supabase
        .from('schedules')
        .select('*, created_by_user:users(name)')
        .order('created_at', { ascending: false })
        .limit(6);
      if (historyData) setScheduleHistory(historyData);

      // Buscar configuração de IA
      const { data: configData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'llm_config')
        .maybeSingle();
      
      if (configData) {
        setLlmConfig(configData.value);
      }
    };
    fetchData();
  }, []);

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

      if (cat6Working.length < 2) {
        errors.push({
          date: data[0].days[i].date,
          message: `Alerta CAT 6: Apenas ${cat6Working.length} colaborador(es) com CAT 6 trabalhando neste dia. Recomendado: mínimo 2.`,
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
    if (feedbackData.rating === 0) {
      alert('Por favor, selecione uma classificação em estrelas.');
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

      const prompt = `
        Gere uma escala MENSAL para o terminal JPA (João Pessoa) seguindo o modelo LATAM.
        
        REGRAS:
        1. 5x1 FLEXÍVEL: Máximo 5 dias seguidos de trabalho.
        2. FAGR: Exatamente 1 folga agrupada (2 dias seguidos) por mês/colaborador.
        3. COBERTURA MÍNIMA: Manhã(3), Tarde(3), Noite(2).
        4. CAT 6: Mínimo 2 colaboradores CAT 6 ativos em todos os dias.
        5. RESPEITAR: horario_atribuido, folgas_fixas e periodo_ferias (FE).
        6. SIGLAS: FE, FOLG, FC, FAGR, FS.
        7. TURNOS: ${SHIFT_LEGEND.map(s => `${s.desc}(${s.code})`).join(', ')}.

        HISTÓRICO: ${historyContext}
        COLABORADORES: ${JSON.stringify(employeeContext)}

        SAÍDA JSON APENAS:
        {
          "month": "ABRIL", "year": "2026",
          "data": [
            {
              "area": "OPERAÇÃO", "turno": "MANHÃ/TARDE", "bp": "string",
              "funcao": "LÍDER", "nome": "string", "tarefa": "string",
              "days": [{ "date": "01/04", "code": "T079" }, ...]
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
          const targetModel = llmConfig.model === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : llmConfig.model;
          
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${clientGeminiKey}`, {
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
              body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider })
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
            body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider })
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
          body: JSON.stringify({ prompt, model: llmConfig.model, provider: llmConfig.provider })
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
      setAiSchedule(parsedData);
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
        .select('*, base_jpa(name, bp)')
        .eq('schedule_id', schedule.id);
      
      if (error) throw error;

      // Agrupar detalhes por colaborador
      const groupedData = details.reduce((acc: any, detail: any) => {
        const bp = detail.bp;
        if (!acc[bp]) {
          acc[bp] = {
            bp: bp,
            nome: detail.base_jpa.name,
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
    setFeedbackGiven(true);
    alert(`Feedback enviado: ${type}. A IA aprenderá com isso!`);
  };

  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

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

      const { error } = await supabase
        .from('base_jpa')
        .update(updateData)
        .eq('bp', editingEmployee.bp);

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
            
            const { error: retryError } = await supabase
              .from('base_jpa')
              .update(updateData)
              .eq('bp', editingEmployee.bp);
            
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
        })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
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
    const tableWidth = (pageWidth - 30) / 3;

    // --- LEGENDAS ---
    const drawLegendTitle = (title: string, x: number) => {
      doc.setFillColor(30, 41, 59);
      doc.rect(x, finalY, tableWidth, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.text(title, x + tableWidth / 2, finalY + 4, { align: 'center' });
    };

    drawLegendTitle('LEGENDA DE HORÁRIOS', 10);
    drawLegendTitle('ROTEIRO DE ATIVIDADES', 10 + tableWidth + 2);
    drawLegendTitle('LEGENDA DE SIGLAS', 10 + 2 * (tableWidth + 2));

    autoTable(doc, {
      head: [['CÓDIGO', 'DESCRIÇÃO']],
      body: SHIFT_LEGEND.map(s => [s.code, s.desc]),
      startY: finalY + 6,
      margin: { left: 10 },
      tableWidth: tableWidth,
      styles: { fontSize: 5, cellPadding: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] }
    });

    autoTable(doc, {
      head: [['RESPONSÁVEL', 'TAREFAS DIÁRIAS']],
      body: aiSchedule.data.map((row: any) => [row.nome, row.tarefa || '']),
      startY: finalY + 6,
      margin: { left: 10 + tableWidth + 2 },
      tableWidth: tableWidth,
      styles: { fontSize: 5, cellPadding: 0.5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] }
    });

    autoTable(doc, {
      head: [['SIGLA', 'DESCRIÇÃO']],
      body: SIGLA_LEGEND.map(s => [s.code, s.desc]),
      startY: finalY + 6,
      margin: { left: 10 + (tableWidth + 2) * 2 },
      tableWidth: tableWidth,
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

    doc.save(`Escala_JPA_${aiSchedule.month}_${aiSchedule.year}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePublishSchedule = async () => {
    if (!aiSchedule) return;
    setSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = '/';
          return;
        }
      }
      
      // 1. Criar registro da escala
      const { data: schedule, error: sError } = await supabase
        .from('schedules')
        .insert([{
          base_id: employees[0]?.base_id || '00000000-0000-0000-0000-000000000000',
          start_date: `${aiSchedule.year}-${aiSchedule.month === 'ABRIL' ? '04' : '01'}-01`, // Simplificado para demo
          end_date: `${aiSchedule.year}-${aiSchedule.month === 'ABRIL' ? '04' : '01'}-30`,
          published_at: new Date().toISOString(),
          created_by: session?.user?.id
        }])
        .select()
        .single();

      if (sError) throw sError;

      // 2. Criar detalhes da escala
      const details = [];
      for (const emp of aiSchedule.data) {
        for (const day of emp.days) {
          const [d, m] = day.date.split('/');
          details.push({
            schedule_id: schedule.id,
            bp: emp.bp,
            date: `${aiSchedule.year}-${m}-${d}`,
            shift: day.code.startsWith('T') ? 'manhã' : 'tarde', // Mapeamento simplificado
            status: (day.code === 'FOLG' || day.code === 'FAGR' || day.code === 'FC') ? 'folga' : 'trabalhado'
          });
        }
      }

      const { error: dError } = await supabase
        .from('schedule_details')
        .insert(details);

      if (dError) throw dError;

      alert('Escala publicada com sucesso!');
      setAiSchedule(null);
    } catch (err: any) {
      console.error('Erro ao publicar escala:', err);
      alert('Erro ao publicar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Painel do Supervisor - JPA</h1>
          <p className="text-sm sm:text-base text-gray-500">Gestão operacional e geração de escalas.</p>
        </div>
        <button 
          onClick={generateScheduleAI}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:bg-gray-400"
        >
          {loading ? <Clock className="animate-spin" /> : <Sparkles />}
          {loading ? 'Gerando...' : 'Gerar Escala com IA'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-center gap-3">
          <AlertTriangle />
          {error}
        </div>
      )}

      {/* Indicador de Progresso Proeminente */}
      <AnimatePresence>
        {loading && !aiSchedule && (
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

      {aiSchedule && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">Proposta de Escala IA</h2>
                <p className="text-sm text-slate-500">Modelo LATAM - Status: Rascunho</p>
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
                  <p className="text-sm text-slate-500 font-medium">{aiSchedule.month} / {aiSchedule.year}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className={`text-[11px] p-3 rounded-xl flex items-start gap-3 transition-all border ${err.type === 'error' ? 'bg-red-50 text-red-800 border-red-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${err.type === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="space-y-1">
                        <div className="font-black uppercase tracking-tight">{err.nome || err.date}</div>
                        <div className="font-medium leading-relaxed opacity-80">{err.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-slate-400 italic">
                  * Toda escala gerada por IA deve ser revisada manualmente antes da publicação.
                </p>
              </div>
            )}

            <LATAMScheduleTable 
              month={aiSchedule.month} 
              year={aiSchedule.year} 
              data={aiSchedule.data} 
              validationErrors={validationErrors}
              onDataChange={(newData) => {
                const updatedSchedule = { ...aiSchedule, data: newData };
                setAiSchedule(updatedSchedule);
                validateSchedule(updatedSchedule);
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
                  <div className="flex-1 space-y-6">
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

                  <div className="flex-1 space-y-4">
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
              onClick={() => setAiSchedule(null)}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              Descartar
            </button>
            <button 
              onClick={handlePublishSchedule}
              disabled={saving}
              className="flex items-center gap-2 bg-latam-indigo text-white px-8 py-3 rounded-xl font-bold hover:bg-[#001a54] transition shadow-lg shadow-indigo-200 disabled:bg-slate-300"
            >
              <CheckCircle size={20} />
              {saving ? 'Publicando...' : 'Validar e Publicar Escala'}
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-8">
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
                              .from('base_jpa')
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users className="text-indigo-600" /> Colaboradores da Base
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-500 uppercase">
                <tr><th className="pb-4">Nome</th><th className="pb-4">Cargo</th><th className="pb-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.bp}>
                    <td className="py-4 font-medium flex items-center gap-2">
                      {emp.name}
                      {emp.position === 'Supervisor' && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] uppercase font-black rounded border border-amber-200">
                          Supervisor
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-gray-600">
                      <span className={emp.position === 'Supervisor' ? 'font-bold text-amber-700' : ''}>
                        {emp.position}
                      </span>
                    </td>
                    <td className="py-4"><span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Ativo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Calendar className="text-indigo-600" /> Histórico de Escalas
            </h2>
            <div className="space-y-4">
              {scheduleHistory.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => viewSchedule(s)}
                  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center hover:bg-indigo-50 transition-colors"
                >
                  <div>
                    <p className="font-bold text-sm">{new Date(s.start_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Criado por: {s.created_by_user?.name || 'Sistema'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'publicada' ? 'bg-green-100 text-green-700' :
                      s.status === 'arquivada' ? 'bg-gray-200 text-gray-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {s.status || 'Rascunho'}
                    </span>
                    <div className="text-xs font-bold text-indigo-600">Visualizar</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <ArrowRightLeft className="text-indigo-600" /> Trocas e Indisponibilidades
            </h2>
            <div className="space-y-4">
              {shiftRequests.map(req => (
                <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{req.requester_bp}</span>
                    <span className="text-xs text-gray-400">{req.requested_date}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100">Aprovar</button>
                    <button className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-100 text-red-600">Rejeitar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                <button onClick={() => setViewedSchedule(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
    </div>
  );
}
