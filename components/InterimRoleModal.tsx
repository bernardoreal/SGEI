'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Briefcase, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InterimRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleType: 'gerente' | 'coordenador' | 'supervisor';
  baseId?: string; // Only for supervisor
  currentUserId: string;
}

export default function InterimRoleModal({ isOpen, onClose, roleType, baseId, currentUserId }: InterimRoleModalProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('users').select('id, name, base_id');
    
    if (roleType === 'supervisor' && baseId) {
      query = query.eq('base_id', baseId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching employees:', error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  }, [baseId, roleType]);

  useEffect(() => {
    if (isOpen) {
      // Use a wrapper to call the async function
      (async () => {
        await fetchEmployees();
      })();
    }
  }, [isOpen, fetchEmployees]);

  const handleSubmit = async () => {
    if (!assigneeId || !startDate || !endDate) return;

    setSaving(true);
    const { error } = await supabase.from('interim_roles').insert({
      assigner_id: currentUserId,
      assignee_id: assigneeId,
      role_type: roleType,
      base_id: baseId || null,
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error('Error saving interim role:', error);
      alert('Erro ao salvar atribuição.');
    } else {
      alert('Atribuição temporária salva com sucesso!');
      onClose();
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.95 }} 
          animate={{ scale: 1 }} 
          exit={{ scale: 0.95 }}
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-indigo-900">Atribuir {roleType.charAt(0).toUpperCase() + roleType.slice(1)} Interino</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador Substituto</label>
              <select 
                value={assigneeId} 
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Selecione um colaborador</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Início das Férias</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fim das Férias</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
            >
              <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Atribuição'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
