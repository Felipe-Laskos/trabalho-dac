export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** "12912861012" -> "129.128.610-12" */
export function mascararCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/** "80060000" -> "80060-000" */
export function mascararCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

/** "41999990000" -> "(41) 99999-0000" */
export function mascararTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{0,2})/, '($1');
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
}

export function cpfTemFormatoValido(valor: string): boolean {
  return /^\d{11}$/.test(soDigitos(valor));
}

export function cepTemFormatoValido(valor: string): boolean {
  return /^\d{8}$/.test(soDigitos(valor));
}

export function contaTemFormatoValido(valor: string): boolean {
  return /^\d{4}$/.test(valor);
}

export function telefoneTemFormatoValido(valor: string): boolean {
  const d = soDigitos(valor);
  return d.length === 10 || d.length === 11;
}

export function emailTemFormatoValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}
