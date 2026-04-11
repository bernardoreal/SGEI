'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, Briefcase, Info, Download } from 'lucide-react';
import { motion } from 'motion/react';
import LATAMScheduleTable from '@/components/LATAMScheduleTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndSchedule = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Buscar dados do usuário
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();
      
      setUser(userData);

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
    doc.setFontSize(18);
    doc.setTextColor(0, 33, 105);
    doc.text(`MINHA ESCALA - ${schedule.month} / ${schedule.year}`, 14, 20);
    
    const headers = [['DATA', 'DIA', 'CÓDIGO', 'STATUS']];
    const daysArr = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    
    const body = schedule.data[0].days.map((d: any) => {
      const [day, month] = d.date.split('/');
      const date = new Date(parseInt(schedule.year), parseInt(month) - 1, parseInt(day));
      return [
        d.date,
        daysArr[date.getDay()],
        d.code,
        d.code === 'FOLG' || d.code === 'FAGR' ? 'FOLGA' : 'TRABALHO'
      ];
    });

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 30,
      theme: 'striped',
      headStyles: { fillColor: [0, 33, 105] }
    });

    doc.save(`Minha_Escala_${schedule.month}.pdf`);
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
        <div className="grid grid-cols-1 gap-8">
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
      </div>
    </div>
  );
}
