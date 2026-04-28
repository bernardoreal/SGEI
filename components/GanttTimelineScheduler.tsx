'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Columns, StretchHorizontal, Info, AlertTriangle } from 'lucide-react';

export default function GanttTimelineScheduler() {
  // A simplified interactive timeline
  const [shifts, setShifts] = useState([
    { id: 1, name: 'João Pedro', bp: 'BP-1122', start: 8, end: 16, status: 'normal' },
    { id: 2, name: 'Mariana Costa', bp: 'BP-9921', start: 10, end: 18, status: 'normal' },
    { id: 3, name: 'Carlos Silva', bp: 'BP-8812', start: 14, end: 22, status: 'normal' }
  ]);
  
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleDragStart = (id: number) => {
    setDraggingId(id);
  };

  const handleDrag = (id: number, deltaHours: number) => {
    setShifts(prev => prev.map(s => {
      if (s.id === id) {
        const newEnd = s.end + deltaHours;
        const duration = newEnd - s.start;
        // Overtime check (> 8h duration limit)
        const isOvertime = duration > 8;
        return { ...s, end: newEnd <= 24 ? newEnd : 24, status: isOvertime ? 'overtime' : 'normal' };
      }
      return s;
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-[20px] p-6 shadow-xl relative mt-4">
      <div className="flex justify-between items-center mb-6">
         <div className="flex gap-3">
           <h3 className="text-white font-bold tracking-tight text-lg flex items-center gap-2">
             <StretchHorizontal size={20} className="text-indigo-400" />
             Interactive Gantt Timeline
           </h3>
           <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase rounded-lg border border-indigo-500/30 self-center">
             BETA
           </span>
         </div>
         <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Normal
           <div className="w-2 h-2 bg-rose-500 rounded-full ml-3" /> Hora Extra (HE)
         </div>
      </div>

      <div className="bg-slate-800 border border-slate-700/80 rounded-xl overflow-hidden">
        {/* Timeline Header - Hours 04:00 to 24:00 */}
        <div className="grid grid-cols-12 min-w-[800px] border-b border-slate-700/80 bg-slate-800/50 relative px-4 no-print">
          <div className="col-span-2 py-3"></div> {/* Blank for Name label */}
          <div className="col-span-10 grid grid-cols-10 text-[9px] text-slate-500 font-black uppercase text-center py-3">
             <span>04h</span> <span>06h</span> <span>08h</span> <span>10h</span> <span>12h</span> 
             <span>14h</span> <span>16h</span> <span>18h</span> <span>20h</span> <span>22h</span>
          </div>
        </div>

        <div className="px-4 min-w-[800px] pb-4">
           {shifts.map((shift, idx) => {
             // Let's assume timeline starts at 04:00 (width = 20 hours total length across col-span-10 map)
             // Each hour represents a specific percentage width.
             // col-span-10 is the track.
             const startHourOffset = shift.start - 4; 
             const duration = shift.end - shift.start;
             
             // Max range: 04:00 to 24:00 (20 hours total)
             const leftPercent = Math.max(0, (startHourOffset / 20) * 100);
             const widthPercent = Math.min(100, (duration / 20) * 100);

             return (
               <div key={shift.id} className="grid grid-cols-12 py-4 border-b border-slate-700/50 last:border-0 relative group">
                 <div className="col-span-2 flex flex-col justify-center">
                    <span className="text-sm font-bold text-slate-200">{shift.name}</span>
                    <span className="text-[10px] text-slate-500">{shift.bp}</span>
                 </div>
                 <div className="col-span-10 relative bg-slate-900/30 rounded-lg h-10 overflow-hidden group-hover:bg-slate-900/50 transition">
                    <div className="absolute top-0 bottom-0 left-0 w-full grid grid-cols-10 divide-x divide-slate-700/30 pointer-events-none">
                      {Array.from({length: 10}).map((_, i) => <div key={i} />)}
                    </div>
                    
                    <motion.div 
                      layout
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragStart={() => handleDragStart(shift.id)}
                      onDragEnd={(e, info) => {
                         const offset = info.offset.x;
                         // Simulate dragging right to increase duration (every 40px ~ 1 hour)
                         if (offset > 30) handleDrag(shift.id, 1);
                         else if (offset > 80) handleDrag(shift.id, 2);
                         else if (offset < -30) handleDrag(shift.id, -1);
                         setDraggingId(null);
                      }}
                      initial={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      animate={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      style={{ 
                        left: `${leftPercent}%`, 
                        width: `${widthPercent}%` 
                      }}
                      className={`absolute top-1 bottom-1 rounded-md shadow-md ${
                        shift.status === 'overtime' ? 'bg-rose-500/90 border border-rose-400 z-10' : 'bg-indigo-500 border border-indigo-400 z-10'
                      } flex items-center justify-between px-2 cursor-col-resize overflow-hidden`}
                    >
                      <span className="text-[10px] font-bold text-white/80 whitespace-nowrap overflow-hidden text-ellipsis">
                         {shift.start}:00
                      </span>
                      
                      <div className="flex flex-col items-center justify-center opacity-50 space-y-0.5 pointer-events-none">
                        <div className="w-1 h-3 bg-white/50 rounded-full" />
                        <div className="w-1 h-3 bg-white/50 rounded-full" />
                      </div>

                      <span className="text-[10px] font-bold text-white/80 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                         {shift.status === 'overtime' && <AlertTriangle size={10} className="text-white" />}
                         {shift.end}:00
                      </span>
                    </motion.div>
                 </div>
               </div>
             )
           })}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
        <Info size={14} /> Dica de UX: Arraste o final do bloco lateralmente para simular estender o turno (gerar HE). O limite legal acionará alertas visuais e atualizará o CostAnalyticsWidget.
      </div>
    </div>
  );
}
