export function somenteDigitos(
  valor: string | null | undefined
): string {
  return (valor ?? '').replace(/\D/g, '');
}