'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Employee {
  bp: string;
  name: string;
  position: string;
  cargo: string;
  cat_6: boolean;
  email: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('base_employees').select('*').eq('is_active', true);
      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        setEmployees(data || []);
      }
      setLoading(false);
    };

    fetchEmployees();
  }, []);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestão de Colaboradores (Base JPA)</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAT 6</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.bp}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.bp}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.cargo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.cat_6 ? 'Sim' : 'Não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
