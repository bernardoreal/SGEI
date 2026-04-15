// /app/lib/security.ts

export const sanitizePrompt = (prompt: string): string => {
  let sanitized = prompt;

  // Regex para BP (ex: 6 dígitos ou alfanumérico)
  sanitized = sanitized.replace(/\b[A-Z0-9]{5,8}\b/g, '[BP_ANON]');

  // Regex para E-mail
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL_ANON]'
  );

  // Regex para Nomes (Simplificado)
  sanitized = sanitized.replace(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g, '[NOME_ANON]');

  return sanitized;
};
