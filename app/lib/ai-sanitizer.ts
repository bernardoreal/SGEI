export interface Employee {
  bp: string;
  name: string;
  [key: string]: any;
}

export function maskPrompt(prompt: string, employees: Employee[]): { maskedPrompt: string; map: Record<string, string> } {
  let maskedPrompt = prompt;
  const map: Record<string, string> = {};

  employees.forEach((emp, index) => {
    const placeholder = `COLAB_${String(index).padStart(3, '0')}`;
    map[placeholder] = emp.name;
    
    // Substitui o nome por um identificador genérico
    const regex = new RegExp(emp.name, 'gi');
    maskedPrompt = maskedPrompt.replace(regex, placeholder);
    
    // Substitui o BP se necessário (opcional, mas recomendado para segurança total)
    const bpRegex = new RegExp(emp.bp, 'g');
    maskedPrompt = maskedPrompt.replace(bpRegex, `BP_${placeholder}`);
  });

  return { maskedPrompt, map };
}

export function unmaskResponse(response: string, map: Record<string, string>): string {
  let unmaskedResponse = response;
  
  Object.entries(map).forEach(([placeholder, realName]) => {
    const regex = new RegExp(placeholder, 'g');
    unmaskedResponse = unmaskedResponse.replace(regex, realName);
    
    const bpRegex = new RegExp(`BP_${placeholder}`, 'g');
    // Se o BP for necessário na resposta, precisaríamos de um mapeamento reverso também
    // Por enquanto, apenas removemos o prefixo BP_
    unmaskedResponse = unmaskedResponse.replace(bpRegex, placeholder.replace('COLAB_', ''));
  });

  return unmaskedResponse;
}
