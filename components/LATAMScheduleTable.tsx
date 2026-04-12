'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ScheduleDay {
  date: string;
  code: string; // T079, FOLG, FE, etc.
}

interface EmployeeSchedule {
  area: string;
  turno: string;
  bp: string;
  funcao: string;
  nome: string;
  days: ScheduleDay[];
  tarefa: string;
}

interface LATAMScheduleTableProps {
  month: string;
  year: string;
  data: EmployeeSchedule[];
  onDataChange?: (newData: EmployeeSchedule[]) => void;
  validationErrors?: any[];
}

export const SHIFT_LEGEND = [
  { code: 'T034', desc: '04:00-11:52' },
  { code: 'T045', desc: '05:00-13:00' },
  { code: 'T074', desc: '08:00-16:00' },
  { code: 'T231', desc: '08:00-17:24' },
  { code: 'T082', desc: '09:00-17:00' },
  { code: 'T091', desc: '10:00-18:00' },
  { code: 'T087', desc: '09:30-17:30' },
  { code: 'T100', desc: '11:00-19:00' },
  { code: 'T109', desc: '12:00-20:00' },
  { code: 'T120', desc: '13:00-21:00' },
  { code: 'T128', desc: '14:00-22:00' },
  { code: 'T137', desc: '15:00-22:52' },
  { code: 'T145', desc: '16:00-23:45' },
  { code: 'T210', desc: '23:00-06:22' },
  { code: 'T009', desc: '00:30-07:57' },
];

export const SIGLA_LEGEND = [
  { code: 'FE', desc: 'Férias', color: 'bg-gray-200' },
  { code: 'LM', desc: 'Licença Maternidade', color: 'bg-pink-100' },
  { code: 'LG', desc: 'Licença Casamento', color: 'bg-blue-50' },
  { code: 'FDFE', desc: 'Folga Descanso Feriado', color: 'bg-green-100 text-green-800' },
  { code: 'LP', desc: 'Licença Paternidade', color: 'bg-blue-100' },
  { code: 'FOLG', desc: 'Folga Regulamentar', color: 'bg-green-100 text-green-800' },
  { code: 'FS', desc: 'Folga Solicitada', color: 'bg-green-100 text-green-800' },
  { code: 'FAGR', desc: 'Folga Agrupada', color: 'bg-green-100 text-green-800' },
  { code: 'FC', desc: 'Folga Compensa', color: 'bg-green-100 text-green-800' },
  { code: 'C', desc: 'Curso / Treinamento', color: 'bg-indigo-100' },
];

export default function LATAMScheduleTable({ month, year, data, onDataChange, validationErrors }: LATAMScheduleTableProps) {
  const [activeError, setActiveError] = useState<{message: string, type: string} | null>(null);
  const daysInMonth = data[0]?.days.length || 30;
  
  const getCellColor = (code: string) => {
    if (code === 'FOLG' || code === 'FAGR' || code === 'FS' || code === 'FDFE' || code === 'FC') return 'bg-green-100 text-green-800';
    if (code === 'FE') return 'bg-gray-100 text-gray-500';
    if (code.startsWith('T')) return 'bg-white text-slate-700';
    return 'bg-white';
  };

  const handleCellChange = (rowIdx: number, dayIdx: number, newCode: string) => {
    if (!onDataChange) return;
    const newData = JSON.parse(JSON.stringify(data));
    newData[rowIdx].days[dayIdx].code = newCode;
    onDataChange(newData);
  };

  const handleFuncaoChange = (rowIdx: number, newFuncao: string) => {
    if (!onDataChange) return;
    const newData = [...data];
    newData[rowIdx].funcao = newFuncao;
    onDataChange(newData);
  };

  const handleTarefaChange = (rowIdx: number, newTarefa: string) => {
    if (!onDataChange) return;
    const newData = [...data];
    newData[rowIdx].tarefa = newTarefa;
    onDataChange(newData);
  };

  const ALL_CODES = [...SHIFT_LEGEND.map(s => s.code), ...SIGLA_LEGEND.map(s => s.code)];

  const getDayOfWeek = (dateStr: string, yearStr: string) => {
    try {
      const [day, month] = dateStr.split('/');
      const date = new Date(parseInt(yearStr), parseInt(month) - 1, parseInt(day));
      const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
      return days[date.getDay()];
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="w-full space-y-6 overflow-hidden relative">
      <AnimatePresence>
        {activeError && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] no-print"
            onClick={() => setActiveError(null)}
          >
            <div 
              className={`max-w-sm w-full p-6 rounded-3xl shadow-2xl border-2 ${activeError.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} relative`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setActiveError(null)}
                className="absolute top-4 right-4 p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${activeError.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                  <h4 className={`font-black uppercase tracking-tighter ${activeError.type === 'error' ? 'text-red-900' : 'text-amber-900'}`}>
                    Inconsistência Detectada
                  </h4>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">
                    {activeError.message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setActiveError(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${activeError.type === 'error' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}
                >
                  Entendido
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#002169] text-white p-4 text-center rounded-t-xl flex justify-between items-center">
        <div className="w-10" />
        <h2 className="text-2xl font-bold tracking-widest uppercase">
          ESCALA JPA {month} _ {year}
        </h2>
        <div className="text-[10px] bg-white/20 px-2 py-1 rounded uppercase font-bold no-print">
          Modo Edição Ativo
        </div>
      </div>

      <div className="overflow-x-auto border-x border-b border-slate-200 rounded-b-xl shadow-xl">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold uppercase">
              <th rowSpan={2} className="border border-slate-200 p-2 sticky left-0 bg-slate-100 z-10">ÁREA</th>
              <th rowSpan={2} className="border border-slate-200 p-2 sticky left-[50px] bg-slate-100 z-10">TURNO</th>
              <th rowSpan={2} className="border border-slate-200 p-2 sticky left-[100px] bg-slate-100 z-10">BP</th>
              <th rowSpan={2} className="border border-slate-200 p-2 sticky left-[160px] bg-slate-100 z-10">FUNÇÃO</th>
              <th rowSpan={2} className="border border-slate-200 p-2 sticky left-[240px] bg-slate-100 z-10 min-w-[150px]">NOME</th>
              {data[0]?.days.map((day, idx) => {
                const dow = getDayOfWeek(day.date, year);
                const isWeekend = dow === 'SÁB' || dow === 'DOM';
                return (
                  <th 
                    key={`dow-${idx}`} 
                    className={`border border-slate-200 p-1 min-w-[45px] text-center text-[9px] font-black ${isWeekend ? 'bg-latam-crimson text-white' : 'text-latam-indigo'}`}
                  >
                    {dow}
                  </th>
                );
              })}
            </tr>
            <tr className="bg-slate-100 text-slate-600 font-bold uppercase">
              {data[0]?.days.map((day, idx) => (
                <th key={`date-${idx}`} className="border border-slate-200 p-1 min-w-[45px] text-center text-[10px] font-medium opacity-70">
                  {day.date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const hasError = validationErrors?.some(e => e.bp === row.bp);
              return (
                <tr key={rowIdx} className={`hover:bg-slate-50 transition-colors ${hasError ? 'bg-red-50/30' : ''}`}>
                  <td className={`border border-slate-200 p-2 font-bold sticky left-0 z-10 ${hasError ? 'bg-red-50' : 'bg-white'}`}>{row.area}</td>
                  <td className={`border border-slate-200 p-2 sticky left-[50px] z-10 ${hasError ? 'bg-red-50' : 'bg-white'}`}>{row.turno}</td>
                  <td className={`border border-slate-200 p-2 sticky left-[100px] z-10 ${hasError ? 'bg-red-50' : 'bg-white'}`}>{row.bp}</td>
                  <td className={`border border-slate-200 p-2 sticky left-[160px] z-10 ${hasError ? 'bg-red-50' : 'bg-white'}`}>
                    <input 
                      type="text"
                      value={row.funcao}
                      onChange={(e) => handleFuncaoChange(rowIdx, e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 outline-none p-1 rounded no-print"
                    />
                    <span className="hidden print-only">{row.funcao}</span>
                  </td>
                  <td className={`border border-slate-200 p-2 font-bold sticky left-[240px] z-10 ${hasError ? 'bg-red-50 text-red-700' : 'bg-white'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{row.nome}</span>
                      {hasError && (
                        <div className="flex gap-1 no-print">
                          {validationErrors?.filter(e => e.bp === row.bp && !e.date).map((err, i) => (
                            <button 
                              key={i}
                              onClick={() => setActiveError(err)}
                              className={`p-1 rounded-md transition-transform hover:scale-110 ${err.type === 'error' ? 'text-red-500 bg-red-100' : 'text-amber-500 bg-amber-100'}`}
                            >
                              <AlertTriangle size={10} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  {row.days.map((day, dayIdx) => {
                    const dayError = validationErrors?.find(e => (e.bp === row.bp || !e.bp) && e.date === day.date);
                    return (
                      <td 
                        key={dayIdx} 
                        className={`border border-slate-200 p-0 text-center font-bold relative group/cell ${getCellColor(day.code)} ${dayError ? (dayError.type === 'error' ? 'ring-1 ring-inset ring-red-400 bg-red-50/50' : 'ring-1 ring-inset ring-amber-400 bg-amber-50/50') : ''}`}
                      >
                        <div className="relative w-full h-full flex items-center justify-center">
                          <select 
                            value={day.code}
                            onChange={(e) => handleCellChange(rowIdx, dayIdx, e.target.value)}
                            className="w-full h-full bg-transparent text-center border-none focus:ring-2 focus:ring-indigo-500 outline-none p-1 uppercase appearance-none cursor-pointer no-print"
                          >
                            {ALL_CODES.map(code => (
                              <option key={code} value={code} className="text-slate-900 bg-white">
                                {code}
                              </option>
                            ))}
                          </select>
                          <span className="hidden print-only">{day.code}</span>
                          
                          {dayError && (
                            <button 
                              onClick={() => setActiveError(dayError)}
                              className={`absolute -top-1 -right-1 z-20 p-0.5 rounded-full shadow-sm transition-all scale-0 group-hover/cell:scale-100 no-print ${dayError.type === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}
                            >
                              <Info size={8} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Legenda de Horários */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-white p-2 text-center text-xs font-bold uppercase">
            Legenda de Horários
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-left">CÓDIGO</th>
                <th className="p-2 text-left">DESCRIÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SHIFT_LEGEND.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-bold text-slate-700">{item.code}</td>
                  <td className="p-2 text-slate-500">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Roteiro de Atividades */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#002169] text-white p-2 text-center text-xs font-bold uppercase">
            Roteiro de Atividades
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-left">RESPONSÁVEL</th>
                <th className="p-2 text-left">TAREFAS DIÁRIAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2 font-bold text-slate-700">{row.nome}</td>
                  <td className="p-2 text-slate-500">
                    <div className="relative w-full">
                      <input 
                        type="text"
                        value={row.tarefa}
                        onChange={(e) => handleTarefaChange(idx, e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 outline-none p-1 rounded no-print"
                      />
                      <span className="hidden print-only">{row.tarefa}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legenda de Siglas */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-white p-2 text-center text-xs font-bold uppercase">
            Legenda de Siglas
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-left">SIGLA</th>
                <th className="p-2 text-left">DESCRIÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SIGLA_LEGEND.map((item, idx) => (
                <tr key={idx}>
                  <td className={`p-2 font-bold ${item.color} text-slate-700`}>{item.code}</td>
                  <td className="p-2 text-slate-500">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
