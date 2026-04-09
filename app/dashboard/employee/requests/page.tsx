'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ShiftRequestsPage() {
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('pendente');
  const [loading, setLoading] = useState(false);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Assumindo que o BP do usuário logado está disponível no contexto
    // Para o MVP, vamos usar um BP fixo para teste
    const { error } = await supabase
      .from('shift_requests')
      .insert({
        requester_bp: '12345', 
        requested_date: date,
        status: 'pendente',
      });

    if (error) {
      console.error('Error submitting request:', error);
      alert('Erro ao enviar solicitação.');
    } else {
      alert('Solicitação enviada com sucesso!');
      setDate('');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Solicitação de Troca de Turno / Indisponibilidade</h1>
      <form onSubmit={submitRequest} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {loading ? 'Enviando...' : 'Enviar Solicitação'}
        </button>
      </form>
    </div>
  );
}
