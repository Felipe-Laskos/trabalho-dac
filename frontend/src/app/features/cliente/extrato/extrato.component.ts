import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DateTime } from 'luxon';

import type { Conta, Extrato } from '../../../core/models/conta.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { ExtratoService } from '../../../core/services/extrato.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { exibirData, intervaloValido, periodoPadrao } from '../../../shared/util/data.util';
import { montarLinhaDoTempo, type DiaExtrato } from '../../../shared/util/extrato.util';
import { DinheiroPipe } from '../../../shared/pipes/dinheiro.pipe';

type EstadoTela = 'carregando' | 'pronto' | 'erro';

const ZONA = 'America/Sao_Paulo';

@Component({
  selector: 'app-extrato',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DatePicker,
    LoadingComponent,
    MessageComponent,
    DinheiroPipe,
  ],
  templateUrl: './extrato.component.html',
  styleUrl: './extrato.component.scss',
})
export class ExtratoComponent {
  private readonly auth = inject(AuthService);
  private readonly contas = inject(ContaService);
  private readonly extratos = inject(ExtratoService);

  protected readonly usuario = this.auth.usuario;

  protected readonly estado = signal<EstadoTela>('carregando');
  protected readonly conta = signal<Conta | null>(null);
  protected readonly extrato = signal<Extrato | null>(null);
  protected readonly dias = signal<DiaExtrato[]>([]);
  protected readonly consultando = signal(false);
  protected readonly mensagemErro = signal('');
  protected readonly mensagemValidacao = signal('');

  protected readonly inicioSelecionado = signal<Date | null>(null);
  protected readonly fimSelecionado = signal<Date | null>(null);

  constructor() {
    void this.carregar();
  }

  protected formatarData(data: string): string {
    return exibirData(data);
  }

  protected async carregar(): Promise<void> {
    const cpf = this.usuario()?.cpf;

    if (!cpf) {
      this.estado.set('erro');
      this.mensagemErro.set('Não encontramos o CPF da sessão.');
      return;
    }

    this.estado.set('carregando');
    this.mensagemErro.set('');

    try {
      const contaAtual = await this.contas.obterPorCliente(cpf);
      this.conta.set(contaAtual);

      const periodo = periodoPadrao();

      this.inicioSelecionado.set(periodo.inicio.toJSDate());
      this.fimSelecionado.set(periodo.fim.toJSDate());

      this.estado.set('pronto');

      await this.consultarPeriodo(periodo.inicio, periodo.fim);
    } catch (erro: unknown) {
      this.estado.set('erro');
      this.mensagemErro.set(mensagemDeErro(erro));
    }
  }

  protected async consultar(): Promise<void> {
    const inicio = this.inicioSelecionado();
    const fim = this.fimSelecionado();

    this.mensagemErro.set('');
    this.mensagemValidacao.set('');

    if (!inicio || !fim) {
      this.mensagemValidacao.set('Selecione a data inicial e a data final.');
      return;
    }

    const dataInicio = this.converterData(inicio);
    const dataFim = this.converterData(fim);

    if (!intervaloValido(dataInicio, dataFim)) {
      this.mensagemValidacao.set('Informe um período válido de até 365 dias.');
      return;
    }

    await this.consultarPeriodo(dataInicio, dataFim);
  }

  private async consultarPeriodo(inicio: DateTime, fim: DateTime): Promise<void> {
    const contaAtual = this.conta();
    const cpf = this.usuario()?.cpf;

    if (!contaAtual || !cpf || this.consultando()) {
      return;
    }

    this.consultando.set(true);
    this.mensagemErro.set('');
    this.extrato.set(null);
    this.dias.set([]);

    try {
      const resultado = await this.extratos.consultar(contaAtual.numero, inicio, fim);

      this.extrato.set(resultado);
      this.dias.set(montarLinhaDoTempo(resultado, cpf));
    } catch (erro: unknown) {
      this.mensagemErro.set(mensagemDeErro(erro));
    } finally {
      this.consultando.set(false);
    }
  }

  protected formatarSaldo(dia: DiaExtrato): string {
    return dia.saldoConsolidado.toFixed(2);
  }

  private converterData(data: Date): DateTime {
    return DateTime.fromJSDate(data, { zone: ZONA }).startOf('day');
  }
}
