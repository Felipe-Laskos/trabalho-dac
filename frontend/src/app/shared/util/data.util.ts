import { DateTime } from 'luxon';

const ZONA = 'America/Sao_Paulo';
const UM_DIA_MS = 86_400_000;

export function doISO(iso: string): DateTime {
  return DateTime.fromISO(iso, { zone: ZONA });
}

export function paraAPI(data: DateTime): string {
  return data.toFormat('yyyy-MM-dd');
}

export function exibirDataHora(iso: string): string {
  const data = doISO(iso);

  return data.isValid ? data.toFormat('dd/MM/yyyy HH:mm') : '\u2014';
}

export function exibirData(iso: string): string {
  const data = doISO(iso);

  return data.isValid ? data.toFormat('dd/MM/yyyy') : '\u2014';
}

export function periodoPadrao(): { inicio: DateTime; fim: DateTime } {
  const fim = DateTime.now().setZone(ZONA).startOf('day');
  return { inicio: fim.minus({ days: 29 }), fim };
}

export function diasEntre(inicio: DateTime, fim: DateTime): number {
  return Math.round((fim.startOf('day').toMillis() - inicio.startOf('day').toMillis()) / UM_DIA_MS);
}

export function intervaloValido(inicio: DateTime, fim: DateTime): boolean {
  if (!inicio.isValid || !fim.isValid || fim < inicio) {
    return false;
  }
  return diasEntre(inicio, fim) <= 365;
}

export function diasDoPeriodo(inicio: DateTime, fim: DateTime): DateTime[] {
  const dias: DateTime[] = [];
  for (let d = inicio.startOf('day'); d <= fim.startOf('day'); d = d.plus({ days: 1 })) {
    dias.push(d);
  }
  return dias;
}
