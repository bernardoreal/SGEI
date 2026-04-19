import { supabase } from '@/lib/supabase';

/**
 * Funções de agregação de dados estratégico para o dashboard do Gerente.
 */

// Retorna a tendência de conformidade/feedback dos últimos 6 meses por base
export async function getMonthlyComplianceTrend() {
  // Simulação de agregação de dados de feedback/logs para o dashboard
  // Em um cenário real, realizaríamos um join entre schedule_feedback e schedules
  // para verificar a taxa de conformidade/satisfação mês a mês.
  
  const { data, error } = await supabase
    .from('schedule_feedback')
    .select('created_at, feedback')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar tendência de conformidade:', error);
    return [];
  }

  // Agrega feedbacks por mês (simples)
  const monthlyData = data.reduce((acc: any, curr: any) => {
    const month = new Date(curr.created_at).toLocaleString('pt-BR', { month: 'short' });
    if (!acc[month]) acc[month] = { boa: 0, ruim: 0 };
    acc[month][curr.feedback === 'boa' ? 'boa' : 'ruim']++;
    return acc;
  }, {});

  return Object.entries(monthlyData).map(([name, counts]: [string, any]) => ({
    name,
    boa: counts.boa,
    ruim: counts.ruim
  }));
}
