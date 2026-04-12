export function maskPrompt(prompt: string, employees: any[]) {
  let maskedPrompt = prompt;
  const map: Record<string, string> = {};
  let counter = 1;

  employees.forEach(emp => {
    if (emp.name) {
      const placeholder = `[NAME_${counter}]`;
      map[placeholder] = emp.name;
      maskedPrompt = maskedPrompt.split(emp.name).join(placeholder);
      counter++;
    }
    if (emp.bp) {
      const placeholder = `[BP_${counter}]`;
      map[placeholder] = emp.bp;
      maskedPrompt = maskedPrompt.split(emp.bp).join(placeholder);
      counter++;
    }
  });

  return { maskedPrompt, map };
}

export function unmaskResponse(response: string, map: Record<string, string>) {
  let unmaskedResponse = response;
  Object.keys(map).forEach(placeholder => {
    unmaskedResponse = unmaskedResponse.split(placeholder).join(map[placeholder]);
  });
  return unmaskedResponse;
}
