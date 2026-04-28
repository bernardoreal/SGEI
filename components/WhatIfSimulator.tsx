'use client';

import { useState } from 'react';
import { Target, TrendingUp, AlertCircle, DollarSign, Calculator, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function WhatIfSimulator() {
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [base, setBase] = useState('VCP');
  const [event, setEvent] = useState('Black Friday');
  const [volumeIncrease, setVolumeIncrease] = useState('30');

  const handleSimulate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSimulated(true);
    }, 2500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Target size={20} />
          <h3 className="font-bold uppercase tracking-wide">&quot;What-If&quot; Simulador de Malha</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Terminal Alvo</label>
          <select 
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          >
            <option value="VCP">VCP (Campinas)</option>
            <option value="GRU">GRU (Guarulhos)</option>
            <option value="JPA">JPA (João Pessoa)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Cenário de Estresse</label>
          <input 
            type="text" 
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ex: Black Friday"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Variação Projetada (% Vol)</label>
          <div className="relative">
            <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="number" 
              value={volumeIncrease}
              onChange={(e) => setVolumeIncrease(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pl-10 text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSimulate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            Processando Redes Neurais...
          </>
        ) : (
          <>
            <Play size={16} />
            Rodar Simulação Preditiva
          </>
        )}
      </button>

      <AnimatePresence>
        {simulated && !loading && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700/50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
                    <AlertCircle size={18} />
                    <h5 className="font-bold text-sm uppercase">Ponto de Ruptura (Gargalo)</h5>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    A escala atual vai romper no dia <strong className="text-rose-600 dark:text-rose-400">22 de Novembro (Turno MANHÃ)</strong>. Faltarão cerca de 4 colaboradores operacionais para absorver o pico de +{volumeIncrease}% em {base}.
                  </p>
               </div>
               
               <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <DollarSign size={18} />
                    <h5 className="font-bold text-sm uppercase">Custo Projetado (Headcount)</h5>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-3">
                    Estima-se a necessidade de abertura de +210 horas extras pulverizadas na semana.
                  </p>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded px-3 py-2 border border-slate-200 dark:border-slate-700 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    <Calculator size={16} className="text-emerald-500" /> + R$ 6.300,00 Estimados
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
