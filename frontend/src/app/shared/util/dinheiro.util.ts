import Decimal from 'decimal.js';

export const paraDecimal = (v: string): Decimal =>
  new Decimal(v);

export const paraContrato = (d: Decimal): string =>
  d.toFixed(2);

export function formatarBRL(v: string): string {
  const n = new Decimal(v);

  return n.toNumber().toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function doInput(texto: string): string {
  return new Decimal(
    texto.replace(/\./g, '').replace(',', '.')
  ).toFixed(2);
}