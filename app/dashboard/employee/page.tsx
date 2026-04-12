'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, Briefcase, Info, Download, Send, History, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LATAMScheduleTable from '@/components/LATAMScheduleTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState({
    date: '',
    shift: '',
    reason: ''
  });

  const fetchRequests = async (bp: string) => {
    const { data } = await supabase
      .from('shift_requests')
      .select('*')
      .eq('requester_bp', bp)
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  useEffect(() => {
    const fetchUserAndSchedule = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        if (sessionError.message.includes('Refresh Token Not Found') || sessionError.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = '/';
          return;
        }
      }

      if (!session) return;

      // 1. Buscar dados do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();
      
      setUser(userData);
      if (userData?.bp) fetchRequests(userData.bp);

      // 2. Buscar a escala publicada mais recente para este usuário (BP)
      const fetchSchedule = async () => {
        const { data: latestSchedule } = await supabase
          .from('schedules')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(1)
          .single();

        if (latestSchedule) {
          const { data: details } = await supabase
            .from('schedule_details')
            .select('*')
            .eq('schedule_id', latestSchedule.id)
            .eq('bp', userData?.bp || '');

          if (details && details.length > 0) {
            // Formatar para o componente de tabela
            const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
            const dateObj = new Date(latestSchedule.start_date);
            
            setSchedule({
              month: monthNames[dateObj.getMonth()],
              year: dateObj.getFullYear().toString(),
              data: [{
                area: 'OPERAÇÃO',
                turno: details[0].shift === 'manhã' ? 'MANHÃ' : 'TARDE',
                bp: userData?.bp,
                funcao: userData?.cargo || 'Colaborador',
                nome: userData?.name,
                tarefa: 'Atividades Operacionais',
                days: details.map((d: any) => {
                  const dayDate = new Date(d.date);
                  return {
                    date: `${String(dayDate.getDate() + 1).padStart(2, '0')}/${String(dayDate.getMonth() + 1).padStart(2, '0')}`,
                    code: d.status === 'folga' ? 'FOLG' : 'T074' // Simplificado
                  };
                })
              }]
            });
          }
        }
        setLoading(false);
      };

      fetchSchedule();

      // 3. Inscrever para atualizações em tempo real
      const channel = supabase
        .channel('public:schedules')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'schedules' }, fetchSchedule)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchUserAndSchedule();
  }, []);

  const handleExportPDF = () => {
    if (!schedule) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- CABEÇALHO ESTILO LATAM ---
    doc.setFillColor(0, 33, 105); // LATAM Indigo
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LATAM', 14, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('AIRLINES', 14, 19);

    doc.setFontSize(16);
    doc.text(`MINHA ESCALA INDIVIDUAL - JPA`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${schedule.month} / ${schedule.year}`, pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`COLABORADOR: ${user?.name}`, pageWidth - 14, 15, { align: 'right' });
    doc.text(`BP: ${user?.bp}`, pageWidth - 14, 20, { align: 'right' });

    const headers = [['DATA', 'DIA', 'CÓDIGO', 'STATUS', 'TAREFA']];
    const daysArr = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    
    const body = schedule.data[0].days.map((d: any) => {
      const [day, month] = d.date.split('/');
      const date = new Date(parseInt(schedule.year), parseInt(month) - 1, parseInt(day));
      return [
        d.date,
        daysArr[date.getDay()],
        d.code,
        d.code === 'FOLG' || d.code === 'FAGR' || d.code === 'FC' ? 'FOLGA' : 'TRABALHO',
        schedule.data[0].tarefa || 'Atividades Operacionais'
      ];
    });

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 33, 105], textColor: [255, 255, 255] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'FOLGA') {
            data.cell.styles.fillColor = [220, 252, 231];
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
      }
    });

    doc.save(`Minha_Escala_LATAM_${schedule.month}.pdf`);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.date || !newRequest.reason) {
      alert('Por favor, preencha a data e o motivo.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('shift_requests')
        .insert([{
          base_id: user.base_id,
          requester_bp: user.bp,
          requested_date: newRequest.date,
          requested_shift: newRequest.shift || 'Indisponibilidade',
          reason: newRequest.reason,
          status: 'pendente'
        }]);

      if (error) throw error;

      alert('Solicitação enviada com sucesso!');
      setNewRequest({ date: '', shift: '', reason: '' });
      fetchRequests(user.bp);
    } catch (err: any) {
      console.error('Erro ao enviar solicitação:', err);
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-latam-indigo"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header do Colaborador */}
      <div className="bg-latam-indigo text-white pb-24 pt-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/60 text-sm font-medium">
                <span className="flex items-center gap-1"><Briefcase size={14} /> {user?.cargo || 'Colaborador'}</span>
                <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                <span>BP: {user?.bp}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleExportPDF}
            className="bg-white text-latam-indigo px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition shadow-lg"
          >
            <Download size={20} /> Exportar Minha Escala
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-6 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Escala */}
          <div className="lg:col-span-2 space-y-8">
            {schedule ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Escala Mensal Publicada</h2>
                    </div>
                    <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                      Oficial
                    </div>
                  </div>

                  <LATAMScheduleTable 
                    month={schedule.month}
                    year={schedule.year}
                    data={schedule.data}
                  />
                </div>
                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center gap-2 text-slate-500 text-sm">
                  <Info size={16} />
                  <span>Esta escala foi validada pelo seu supervisor e está em conformidade com o regime 5x1.</span>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Clock size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma escala publicada</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Sua escala para o mês atual ainda não foi publicada pelo supervisor. Você receberá uma notificação assim que estiver disponível.
                </p>
              </div>
            )}
          </div>

          {/* Coluna da Direita: Solicitações */}
          <div className="space-y-8">
            {/* Formulário de Solicitação */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-crimson-50 text-latam-crimson rounded-xl flex items-center justify-center">
                    <Send size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Nova Solicitação</h2>
                </div>

                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data</label>
                    <input 
                      type="date"
                      required
                      value={newRequest.date}
                      onChange={(e) => setNewRequest({...newRequest, date: e.target.value})}
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-latam-indigo rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Turno Desejado (Opcional)</label>
                    <select 
                      value={newRequest.shift}
                      onChange={(e) => setNewRequest({...newRequest, shift: e.target.value})}
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-latam-indigo rounded-xl p-3 text-sm"
                    >
                      <option value="">Indisponibilidade Total</option>
                      <option value="Manhã">Manhã</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noite">Noite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motivo / Justificativa</label>
                    <textarea 
                      required
                      rows={3}
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                      placeholder="Explique o motivo da sua solicitação..."
                      className="w-full bg-slate-50 border-none focus:ring-2 focus:ring-latam-indigo rounded-xl p-3 text-sm resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-latam-indigo text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition disabled:opacity-50"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Histórico de Solicitações */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Minhas Solicitações</h2>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {requests.length > 0 ? (
                    requests.map((req) => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-slate-700">
                            {new Date(req.requested_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'aprovado' ? 'bg-green-100 text-green-700' :
                            req.status === 'rejeitado' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{req.reason}</p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} /> {req.requested_shift}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400">Nenhuma solicitação encontrada.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
