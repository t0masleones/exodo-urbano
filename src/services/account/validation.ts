/** Validações feitas no aparelho antes de falar com o servidor (que valida de novo). */

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Esse e-mail não parece válido.';
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (pw.length > 128) return 'Senha longa demais (máximo de 128 caracteres).';
  if (!/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return 'Misture letras e números na senha.';
  return null;
}
