import Decimal from 'decimal.js';
import type { Dinheiro } from '../../core/models/dinheiro';

export function paraDecimal(valor: Dinheiro): Decimal {
  return new Decimal(valor);
}

export function paraContrato(valor: Decimal): Dinheiro {
  return valor.toFixed(2);
}

export function formatarBRL(valor: Dinheiro): string {
  return new Decimal(valor).toNumber().toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarNumero(valor: Dinheiro): string {
  return new Decimal(valor).toNumber().toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function doInput(texto: string): Dinheiro | null {
  const limpo = texto.replace(/[R$\s.]/g, '').replace(',', '.');
  if (limpo === '' || !/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return null;
  }
  return new Decimal(limpo).toFixed(2);
}

export function ehValorOperavel(valor: Dinheiro | null): boolean {
  return valor !== null && new Decimal(valor).greaterThan(0);
}
