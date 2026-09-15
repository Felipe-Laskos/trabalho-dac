import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { OperacaoService } from '../../../core/services/operacao.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Conta, OperacaoRealizada, TipoOperacao } from '../../../core/models/conta.model';
import type { Dinheiro } from '../../../core/models/dinheiro';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { MessageComponent } from '../../../shared/components/message/message.component';
import { MoneyInputComponent } from '../../../shared/components/money-input/money-input.component';
import { AccountNumberInputComponent } from '../../../shared/components/account-number-input/account-number-input.component';
import { BalanceIndicatorComponent } from '../../../shared/components/balance-indicator/balance-indicator.component';
import {
  ModalConfirmationComponent,
  type DetalheOperacao,
} from '../../../shared/components/modal-confirmation/modal-confirmation.component';
import {
  OperationResultComponent,
  type DadosResultadoOperacao,
} from '../../../shared/components/operation-result/operation-result.component';

type EstadoTela = 'carregando' | 'ok' | 'erro';

const ROTULOS: Record<TipoOperacao, { titulo: string; acao: string; confirmar: string }> = {
  DEPOSITO: {
    titulo: 'Depósito',
    acao: 'Depositar',
    confirmar: 'Confirmar depósito',
  },
  SAQUE: {
    titulo: 'Saque',
    acao: 'Sacar',
    confirmar: 'Confirmar saque',
  },
  TRANSFERENCIA: {
    titulo: 'Transferência',
    acao: 'Transferir',
    confirmar: 'Confirmar transferência',
  },
};

@Component({
  selector: 'app-operacao-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    CardModule,
    LoadingComponent,
    MessageComponent,
    MoneyInputComponent,
    AccountNumberInputComponent,
    BalanceIndicatorComponent,
    ModalConfirmationComponent,
    OperationResultComponent,
  ],
  templateUrl: './operacao-page.component.html',
  styleUrl: './operacao-page.component.scss',
})
export class OperacaoPageComponent {
  private readonly rota = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly contas = inject(ContaService);
  private readonly operacoes = inject(OperacaoService);

  protected readonly tipo: TipoOperacao =
    (this.rota.snapshot.data['tipo'] as TipoOperacao | undefined) ?? 'DEPOSITO';
  protected readonly textos = ROTULOS[this.tipo];
  protected readonly ehTransferencia = this.tipo === 'TRANSFERENCIA';

  protected readonly estado = signal<EstadoTela>('carregando');
  protected readonly mensagemErro = signal('');
  protected readonly avisoTimeout = signal('');
  protected readonly conta = signal<Conta | null>(null);
  protected readonly atualizandoSaldo = signal(false);
  protected readonly processando = signal(false);
  protected readonly modalAberto = signal(false);
  protected readonly resultado = signal<DadosResultadoOperacao | null>(null);

  readonly form = new FormGroup({
    valor: new FormControl<Dinheiro | null>(null),
    contaDestino: new FormControl(''),
  });

  protected readonly detalhesModal = computed<DetalheOperacao[]>(() => {
    const itens: DetalheOperacao[] = [
      { rotulo: 'Conta', valor: this.conta()?.numero },
      { rotulo: 'Valor', valor: this.form.controls.valor.value, destaque: true, moeda: true },
    ];
    if (this.ehTransferencia) {
      itens.splice(1, 0, {
        rotulo: 'Destino',
        valor: this.form.controls.contaDestino.value,
      });
    }
    return itens;
  });

  constructor() {
    void this.carregarConta();
  }

  async carregarConta(): Promise<void> {
    const cpf = this.auth.usuario()?.cpf;
    if (!cpf) {
      this.estado.set('erro');
      this.mensagemErro.set('Não encontramos o CPF da sessão.');
      return;
    }

    this.estado.set('carregando');
    this.mensagemErro.set('');

    try {
      this.conta.set(await this.contas.obterPorCliente(cpf));
      this.estado.set('ok');
    } catch (erro) {
      this.estado.set('erro');
      this.mensagemErro.set(this.textoDeErro(erro));
    }
  }

  pedirConfirmacao(): void {
    this.mensagemErro.set('');
    this.form.markAllAsTouched();

    if (this.form.controls.valor.invalid) {
      this.mensagemErro.set('Informe um valor maior que zero.');
      return;
    }

    if (this.ehTransferencia) {
      const destino = this.form.controls.contaDestino.value ?? '';
      if (this.form.controls.contaDestino.invalid || !/^\d{4}$/.test(destino)) {
        this.mensagemErro.set('Informe a conta destino com 4 dígitos.');
        return;
      }
      if (destino === this.conta()?.numero) {
        this.mensagemErro.set('Transferência para a própria conta não é permitida.');
        return;
      }
    }

    this.modalAberto.set(true);
  }

  fecharModal(): void {
    if (!this.processando()) {
      this.modalAberto.set(false);
    }
  }

  async confirmar(): Promise<void> {
    const numero = this.conta()?.numero;
    const valor = this.form.controls.valor.value;
    if (!numero || !valor || this.processando()) {
      return;
    }

    const saldoAnterior = this.conta()?.saldo;
    this.processando.set(true);
    this.avisoTimeout.set('');

    try {
      const feita = await this.enviar(numero, valor);
      this.modalAberto.set(false);
      this.atualizandoSaldo.set(true);

      if (saldoAnterior !== undefined) {
        const consulta = await this.contas.aguardarNovoSaldo(numero, saldoAnterior);
        this.conta.set(consulta.conta);
        if (!consulta.convergiu) {
          this.avisoTimeout.set(
            'O saldo ainda não atualizou. Ele deve aparecer em instantes — não usamos um valor calculado aqui.',
          );
        }
      }

      this.resultado.set({
        tipo: 'SUCESSO',
        tipoOperacao: this.textos.titulo,
        numeroConta: feita.numeroConta,
        dataHora: feita.dataHora,
        valor: feita.valor,
        destinatario: feita.destino?.nome ?? null,
      });
      this.form.reset({ valor: null, contaDestino: '' });
    } catch (erro) {
      this.modalAberto.set(false);
      this.resultado.set({
        tipo: this.tipoDeErro(erro),
        mensagem: this.textoDeErro(erro),
      });
    } finally {
      this.processando.set(false);
      this.atualizandoSaldo.set(false);
    }
  }

  fecharResultado(): void {
    this.resultado.set(null);
  }

  private enviar(numero: string, valor: Dinheiro): Promise<OperacaoRealizada> {
    if (this.tipo === 'SAQUE') {
      return this.operacoes.sacar(numero, valor);
    }
    if (this.tipo === 'TRANSFERENCIA') {
      return this.operacoes.transferir(numero, {
        contaDestino: this.form.controls.contaDestino.value ?? '',
        valor,
      });
    }
    return this.operacoes.depositar(numero, valor);
  }

  private tipoDeErro(erro: unknown): DadosResultadoOperacao['tipo'] {
    if (erro instanceof HttpErrorResponse && erro.status === 403) {
      return 'ERRO_PERMISSAO';
    }
    return 'ERRO_NEGOCIO';
  }

  private textoDeErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse && erro.status === 403) {
      return mensagemDeErro(erro) || 'Você não tem permissão para esta operação.';
    }
    return mensagemDeErro(erro);
  }
}
