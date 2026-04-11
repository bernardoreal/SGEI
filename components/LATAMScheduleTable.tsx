'use client';

import React from 'react';
import { motion } from 'motion/react';

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
}

const SHIFT_LEGEND = [
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

const SIGLA_LEGEND = [
  { code: 'FE', desc: 'Férias', color: 'bg-gray-200' },
  { code: 'LM', desc: 'Licença Maternidade', color: 'bg-pink-100' },
  { code: 'LG', desc: 'Licença Casamento', color: 'bg-blue-50' },
  { code: 'FDFE', desc: 'Folga Descanso Feriado', color: 'bg-green-100' },
  { code: 'LP', desc: 'Licença Paternidade', color: 'bg-blue-100' },
  { code: 'FOLG', desc: 'Folga Regulamentar', color: 'bg-green-200' },
  { code: 'FS', desc: 'Folga Solicitada', color: 'bg-green-50' },
  { code: 'FAGR', desc: 'Folga Agrupada', color: 'bg-green-300' },
  { code: 'FC', desc: 'Folga Compensa', color: 'bg-amber-200' },
  { code: 'C', desc: 'Curso / Treinamento', color: 'bg-indigo-100' },
];

export default function LATAMScheduleTable({ month, year, data, onDataChange }: LATAMScheduleTableProps) {
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
    <div className="w-full space-y-6 overflow-hidden">
      <div className="bg-[#002169] text-white p-4 text-center rounded-t-xl flex justify-between items-center">
        <div className="w-10" />
        <h2 className="text-2xl font-bold tracking-widest uppercase">
          ESCALA JPA {month} _ {year}
        </h2>
        <div className="text-[10px] bg-white/20 px-2 py-1 rounded uppercase font-bold">
          Modo Edição Ativo
        </div>
      </div>

      <div className="overflow-x-auto border-x border-b border-slate-200 rounded-b-xl shadow-xl">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 font-bold uppercase">
              <th className="border border-slate-200 p-2 sticky left-0 bg-slate-100 z-10">ÁREA</th>
              <th className="border border-slate-200 p-2 sticky left-[50px] bg-slate-100 z-10">TURNO</th>
              <th className="border border-slate-200 p-2 sticky left-[100px] bg-slate-100 z-10">BP</th>
              <th className="border border-slate-200 p-2 sticky left-[160px] bg-slate-100 z-10">FUNÇÃO</th>
              <th className="border border-slate-200 p-2 sticky left-[240px] bg-slate-100 z-10 min-w-[150px]">NOME</th>
              {data[0]?.days.map((day, idx) => (
                <th key={idx} className="border border-slate-200 p-1 min-w-[45px] text-center">
                  <div className="text-[9px] font-black text-latam-indigo mb-0.5">{getDayOfWeek(day.date, year)}</div>
                  <div className="text-[10px] font-medium opacity-70">{day.date}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                <td className="border border-slate-200 p-2 font-bold sticky left-0 bg-white z-10">{row.area}</td>
                <td className="border border-slate-200 p-2 sticky left-[50px] bg-white z-10">{row.turno}</td>
                <td className="border border-slate-200 p-2 sticky left-[100px] bg-white z-10">{row.bp}</td>
                <td className="border border-slate-200 p-2 sticky left-[160px] bg-white z-10">{row.funcao}</td>
                <td className="border border-slate-200 p-2 font-bold sticky left-[240px] bg-white z-10">{row.nome}</td>
                {row.days.map((day, dayIdx) => (
                  <td 
                    key={dayIdx} 
                    className={`border border-slate-200 p-0 text-center font-bold ${getCellColor(day.code)}`}
                  >
                    <select 
                      value={day.code}
                      onChange={(e) => handleCellChange(rowIdx, dayIdx, e.target.value)}
                      className="w-full h-full bg-transparent text-center border-none focus:ring-2 focus:ring-indigo-500 outline-none p-1 uppercase appearance-none cursor-pointer"
                    >
                      {ALL_CODES.map(code => (
                        <option key={code} value={code} className="text-slate-900 bg-white">
                          {code}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
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
                    <input 
                      type="text"
                      value={row.tarefa}
                      onChange={(e) => handleTarefaChange(idx, e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-1 focus:ring-indigo-500 outline-none p-1 rounded"
                    />
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
