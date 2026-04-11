'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

interface BaseConfig {
  id: string;
  min_coverage_per_shift: number;
  min_cat6_per_shift: number;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<BaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('base_configuration')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching config:', error);
      } else {
        setConfig(data);
      }
      setLoading(false);
    };

    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
          await supabase.auth.signOut();
          localStorage.clear();
          window.location.href = '/';
          return;
        }
      }
      if (user) setUserId(user.id);
      fetchConfig();
    };
    init();
  }, []);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !userId) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('base_configuration')
      .update({
        min_coverage_per_shift: config.min_coverage_per_shift,
        min_cat6_per_shift: config.min_cat6_per_shift,
      })
      .eq('id', config.id);

    if (error) {
      console.error('Error saving config:', error);
    } else {
      await logAudit(userId, 'UPDATE', 'base_configuration', config.id, null, config);
      alert('Configurações salvas com sucesso!');
    }
    setSaving(false);
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Base JPA</h1>
      {config && (
        <form onSubmit={saveConfig} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cobertura Mínima por Turno</label>
            <input
              type="number"
              value={config.min_coverage_per_shift}
              onChange={(e) => setConfig({ ...config, min_coverage_per_shift: parseInt(e.target.value) })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cobertura Mínima CAT 6 por Turno</label>
            <input
              type="number"
              value={config.min_cat6_per_shift}
              onChange={(e) => setConfig({ ...config, min_cat6_per_shift: parseInt(e.target.value) })}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      )}
    </div>
  );
}
