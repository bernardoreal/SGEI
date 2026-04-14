'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ExportPage() {
  const [loading, setLoading] = useState(false);

  const exportToPDF = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('schedule_details').select('*');
    if (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      return;
    }

    const doc = new jsPDF();
    doc.text('Escala de Trabalho', 10, 10);
    autoTable(doc, {
      head: [['BP', 'Data', 'Turno', 'Status']],
      body: data.map((d: any) => [d.bp, d.date, d.shift, d.status]),
    });
    doc.save('escala.pdf');
    setLoading(false);
  };

  const exportToExcel = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('schedule_details').select('*');
    if (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Escala');
    XLSX.writeFile(wb, 'escala.xlsx');
    setLoading(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Relatórios e Exportação</h1>
      <div className="space-x-4">
        <button
          onClick={exportToPDF}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          Exportar PDF
        </button>
        <button
          onClick={exportToExcel}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
