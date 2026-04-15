'use client';

import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface ScheduleDay {
  date: string;
  code: string;
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

interface MobileScheduleViewProps {
  month: string;
  year: string;
  data: EmployeeSchedule[];
}

export default function MobileScheduleView({ month, year, data }: MobileScheduleViewProps) {
  if (!data || data.length === 0) return null;

  const employee = data[0]; // For employee view, there is only one row of data

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

  const getStatusColor = (code: string) => {
    if (code === 'FOLG' || code === 'FAGR' || code === 'FS' || code === 'FDFE' || code === 'FC') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (code === 'FE') return 'bg-slate-100 text-slate-500 border-slate-200';
    if (code.startsWith('T')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    return 'bg-white border-slate-200 text-slate-700';
  };

  const getStatusLabel = (code: string) => {
    if (code === 'FOLG' || code === 'FAGR' || code === 'FS' || code === 'FDFE' || code === 'FC') return 'Folga';
    if (code === 'FE') return 'Férias';
    if (code.startsWith('T')) return 'Trabalho';
    return code;
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mês Vigente</p>
          <p className="text-lg font-black text-slate-800">{month} {year}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turno Base</p>
          <p className="text-lg font-black text-indigo-600">{employee.turno}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {employee.days.map((day, idx) => {
          const dow = getDayOfWeek(day.date, year);
          const isWeekend = dow === 'SÁB' || dow === 'DOM';
          const isWorkDay = day.code.startsWith('T');
          
          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-4 rounded-2xl border ${getStatusColor(day.code)} transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isWeekend ? 'bg-latam-crimson text-white' : 'bg-white/60 text-slate-700'}`}>
                  <span className="text-[10px] font-bold uppercase">{dow}</span>
                  <span className="text-lg font-black leading-none">{day.date.split('/')[0]}</span>
                </div>
                <div>
                  <p className="font-bold text-sm uppercase tracking-wider">{getStatusLabel(day.code)}</p>
                  <div className="flex items-center gap-1 text-xs mt-0.5 opacity-80 font-medium">
                    {isWorkDay ? (
                      <>
                        <Clock size={12} />
                        <span>Turno: {day.code}</span>
                      </>
                    ) : (
                      <>
                        <Calendar size={12} />
                        <span>{day.code}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {isWorkDay && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">Área</span>
                  <span className="text-xs font-bold bg-white/50 px-2 py-1 rounded-lg">{employee.area}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
