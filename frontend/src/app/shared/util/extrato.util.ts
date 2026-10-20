import Decimal from 'decimal.js';
import type { DateTime } from 'luxon';
import type { Extrato, Movimentacao } from '../../core/models/conta.model';
import { diasDoPeriodo, doISO } from '../../shared/util/data.util';

export interface LinhaMovimentacao extends Movimentacao {
  entrada: boolean;
}

export interface DiaExtrato {
  data: DateTime;
  movimentacoes: LinhaMovimentacao[];
  saldoConsolidado: Decimal;
}

export function ehEntrada(movimentacao: Movimentacao, cpfUsuario: string): boolean {
  if (movimentacao.tipo === 'DEPOSITO') {
    return true;
  }

  if (movimentacao.tipo === 'SAQUE') {
    return false;
  }

  return movimentacao.destino?.cpf === cpfUsuario;
}

export function montarLinhaDoTempo(extrato: Extrato, cpfUsuario: string): DiaExtrato[] {
  const inicio = doISO(extrato.dataInicio);
  const fim = doISO(extrato.dataFim);

  if (!inicio.isValid || !fim.isValid || fim < inicio) {
    return [];
  }

  const porDia = new Map<string, Movimentacao[]>();

  for (const movimentacao of extrato.movimentacoes) {
    const data = doISO(movimentacao.dataHora);
    const chave = data.toISODate();

    if (!data.isValid || !chave) {
      continue;
    }

    const movimentacoesDoDia = porDia.get(chave) ?? [];
    movimentacoesDoDia.push(movimentacao);
    porDia.set(chave, movimentacoesDoDia);
  }

  let saldo = new Decimal(extrato.saldoAbertura);
  const dias: DiaExtrato[] = [];

  for (const data of diasDoPeriodo(inicio, fim)) {
    const chave = data.toISODate();

    if (!chave) {
      continue;
    }

    const doDia = (porDia.get(chave) ?? []).sort((a, b) => a.dataHora.localeCompare(b.dataHora));

    const movimentacoes: LinhaMovimentacao[] = doDia.map((movimentacao) => {
      const entrada = ehEntrada(movimentacao, cpfUsuario);
      const valor = new Decimal(movimentacao.valor);

      saldo = entrada ? saldo.plus(valor) : saldo.minus(valor);

      return { ...movimentacao, entrada };
    });

    dias.push({
      data,
      movimentacoes,
      saldoConsolidado: new Decimal(saldo),
    });
  }

  return dias;
}
