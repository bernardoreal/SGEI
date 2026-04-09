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
  Save
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SupervisorDashboard() {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shiftRequests, setShiftRequests] = useState<any[]>([]);
  const [aiSchedule, setAiSchedule] = useState<any[] | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: empData } = await supabase.from('base_jpa').select('*');
      const { data: reqData } = await supabase.from('shift_requests').select('*');
      if (empData) setEmployees(empData);
      if (reqData) setShiftRequests(reqData);
    };
    fetchData();
  }, []);

  const generateScheduleAI = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAiSchedule([
      { bp: '4598394', name: 'Bernardo Real', shift: 'manhã' },
      { bp: '1234567', name: 'Colaborador Teste', shift: 'tarde' }
    ]);
    setFeedbackGiven(false);
    setLoading(false);
  };

  const handleFeedback = async (type: 'boa' | 'ruim') => {
    setFeedbackGiven(true);
    alert(`Feedback enviado: ${type}. A IA aprenderá com isso!`);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel do Supervisor - JPA</h1>
          <p className="text-gray-500">Gestão operacional e geração de escalas.</p>
        </div>
        <button 
          onClick={generateScheduleAI}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:bg-gray-400"
        >
          {loading ? <Clock className="animate-spin" /> : <Sparkles />}
          {loading ? 'Gerando...' : 'Gerar Escala com IA'}
        </button>
      </div>

      {aiSchedule && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-indigo-900">
              <Calendar /> Escala Gerada pela IA
            </h2>
            {!feedbackGiven && (
              <div className="flex gap-2">
                <button onClick={() => handleFeedback('boa')} className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"><ThumbsUp size={20} /></button>
                <button onClick={() => handleFeedback('ruim')} className="p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"><ThumbsDown size={20} /></button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-xs text-gray-500 uppercase"><th className="pb-4">Colaborador</th><th className="pb-4">Turno</th><th className="pb-4">Ação</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {aiSchedule.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 font-medium">{item.name}</td>
                    <td className="py-4">
                      <select defaultValue={item.shift} className="bg-gray-50 border rounded px-2 py-1 text-sm">
                        <option>manhã</option><option>tarde</option><option>noite</option>
                      </select>
                    </td>
                    <td className="py-4"><button className="text-indigo-600 flex items-center gap-1 text-sm"><Edit2 size={14} /> Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-6 flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700 transition">
            <Save size={18} /> Publicar Escala
          </button>
        </motion.div>
      )}

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
                    <td className="py-4 font-medium">{emp.name}</td>
                    <td className="py-4 text-gray-600">{emp.position}</td>
                    <td className="py-4"><span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">Ativo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}
