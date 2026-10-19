import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import type { Extrato, Movimentacao } from '../../core/models/conta.model';
import { montarLinhaDoTempo, ehEntrada } from './extrato.util';

const CPF_CLIENTE = '11111111111';
const CPF_OUTRO_CLIENTE = '22222222222';

function movimentacao(
  tipo: Movimentacao['tipo'],
  dataHora: string,
  valor: string,
  destino?: Movimentacao['destino'],
): Movimentacao {
  return {
    tipo,
    dataHora,
    valor,
    ...(destino !== undefined ? { destino } : {}),
  };
}

function criarExtrato(
  movimentacoes: Movimentacao[],
  inicio = '2020-01-20',
  fim = '2020-01-22',
  saldoAbertura = '1000.00',
): Extrato {
  return {
    numeroConta: '1291',
    dataInicio: inicio,
    dataFim: fim,
    saldoAbertura,
    movimentacoes,
    _links: {},
  };
}

describe('ehEntrada', () => {
  it('classifica depósito como entrada', () => {
    expect(ehEntrada(movimentacao('DEPOSITO', '2020-01-20T09:00:00', '250.00'), CPF_CLIENTE)).toBe(
      true,
    );
  });

  it('classifica saque como saída', () => {
    expect(ehEntrada(movimentacao('SAQUE', '2020-01-20T09:00:00', '80.00'), CPF_CLIENTE)).toBe(
      false,
    );
  });

  it('classifica transferência recebida como entrada', () => {
    const transferencia = movimentacao('TRANSFERENCIA', '2020-01-20T09:00:00', '500.00', {
      numeroConta: '2222',
      cpf: CPF_CLIENTE,
      nome: 'Cliente',
    });

    expect(ehEntrada(transferencia, CPF_CLIENTE)).toBe(true);
  });

  it('classifica transferência enviada como saída', () => {
    const transferencia = movimentacao('TRANSFERENCIA', '2020-01-20T09:00:00', '120.00', {
      numeroConta: '3333',
      cpf: CPF_OUTRO_CLIENTE,
      nome: 'Outro cliente',
    });

    expect(ehEntrada(transferencia, CPF_CLIENTE)).toBe(false);
  });
});

describe('montarLinhaDoTempo', () => {
  it('gera todos os dias do período, inclusive os sem movimentação', () => {
    const extrato = criarExtrato([movimentacao('DEPOSITO', '2020-01-20T10:00:00', '250.00')]);

    const dias = montarLinhaDoTempo(extrato, CPF_CLIENTE);

    expect(dias).toHaveLength(3);
    expect(dias.map((dia) => dia.data.toISODate())).toEqual([
      '2020-01-20',
      '2020-01-21',
      '2020-01-22',
    ]);

    expect(dias[0].movimentacoes).toHaveLength(1);
    expect(dias[1].movimentacoes).toHaveLength(0);
    expect(dias[2].movimentacoes).toHaveLength(0);

    expect(dias[0].saldoConsolidado.toFixed(2)).toBe('1250.00');
    expect(dias[1].saldoConsolidado.toFixed(2)).toBe('1250.00');
    expect(dias[2].saldoConsolidado.toFixed(2)).toBe('1250.00');
  });

  it('acumula depósitos e saques usando valores decimais', () => {
    const extrato = criarExtrato([
      movimentacao('DEPOSITO', '2020-01-20T09:00:00', '250.00'),
      movimentacao('SAQUE', '2020-01-20T10:00:00', '80.00'),
    ]);

    const dias = montarLinhaDoTempo(extrato, CPF_CLIENTE);

    expect(dias[0].movimentacoes[0].entrada).toBe(true);
    expect(dias[0].movimentacoes[1].entrada).toBe(false);
    expect(dias[0].saldoConsolidado.toFixed(2)).toBe('1170.00');
  });

  it('acumula transferências recebidas e enviadas corretamente', () => {
    const extrato = criarExtrato([
      movimentacao('TRANSFERENCIA', '2020-01-20T09:00:00', '500.00', {
        numeroConta: '2222',
        cpf: CPF_CLIENTE,
        nome: 'Cliente',
      }),
      movimentacao('TRANSFERENCIA', '2020-01-20T10:00:00', '120.00', {
        numeroConta: '3333',
        cpf: CPF_OUTRO_CLIENTE,
        nome: 'Outro cliente',
      }),
    ]);

    const dias = montarLinhaDoTempo(extrato, CPF_CLIENTE);

    expect(dias[0].movimentacoes.map((m) => m.entrada)).toEqual([true, false]);
    expect(dias[0].saldoConsolidado.toFixed(2)).toBe('1380.00');
  });

  it('ordena as movimentações por data e hora antes de calcular o saldo', () => {
    const extrato = criarExtrato([
      movimentacao('SAQUE', '2020-01-20T11:00:00', '30.00'),
      movimentacao('DEPOSITO', '2020-01-20T09:00:00', '50.00'),
    ]);

    const dias = montarLinhaDoTempo(extrato, CPF_CLIENTE);

    expect(dias[0].movimentacoes.map((m) => m.dataHora)).toEqual([
      '2020-01-20T09:00:00',
      '2020-01-20T11:00:00',
    ]);
    expect(dias[0].saldoConsolidado.toFixed(2)).toBe('1020.00');
  });

  it('mantém o saldo de abertura quando não há movimentações', () => {
    const dias = montarLinhaDoTempo(
      criarExtrato([], '2020-01-20', '2020-01-22', '1234.56'),
      CPF_CLIENTE,
    );

    expect(dias).toHaveLength(3);
    expect(dias.every((dia) => dia.movimentacoes.length === 0)).toBe(true);
    expect(dias.every((dia) => dia.saldoConsolidado.equals(new Decimal('1234.56')))).toBe(true);
  });

  it('retorna uma lista vazia quando a data inicial é inválida', () => {
    const extrato = criarExtrato([], 'data-invalida', '2020-01-22');

    expect(montarLinhaDoTempo(extrato, CPF_CLIENTE)).toEqual([]);
  });

  it('retorna uma lista vazia quando a data final vem antes da inicial', () => {
    const extrato = criarExtrato([], '2020-01-22', '2020-01-20');

    expect(montarLinhaDoTempo(extrato, CPF_CLIENTE)).toEqual([]);
  });
});
