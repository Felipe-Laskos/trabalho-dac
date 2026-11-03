import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Button } from 'primeng/button';
import { InputMask } from 'primeng/inputmask';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { JobService, TempoEsgotadoError } from '../../../core/services/job.service';
import { GerenteService } from '../../../core/services/gerente.service';
import { mensagemDeErro } from '../../../core/services/erro.util';
import type { Gerente } from '../../../core/models/gerente.model';
import { soDigitos } from '../../../shared/util/mascara.util';
import { JobProgressComponent } from '../../../shared/components/job-progress/job-progress.component';
import {
  AsyncResultComponent,
  type AsyncResultStatus,
} from '../../../shared/components/async-result/async-result.component';

@Component({
  selector: 'app-inserir-gerente',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Button,
    InputMask,
    InputText,
    Password,
    JobProgressComponent,
    AsyncResultComponent,
  ],
  templateUrl: './inserir-gerente.component.html',
  styleUrl: './inserir-gerente.component.scss',
})
export class InserirGerenteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly gerentes = inject(GerenteService);
  private readonly jobs = inject(JobService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  readonly tentouEnviar = signal(false);
  readonly resultado = signal<{ status: AsyncResultStatus; mensagem: string } | null>(
    null,
  );

  readonly form = this.fb.group({
    nome: ['', Validators.required],
    cpf: ['', [Validators.required, this.digitos(11)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, this.digitosEntre(10, 11)]],
    senha: ['', Validators.required],
  });

  campoComErro(campo: string, erro: string): boolean {
    const controle = this.form.get(campo);
    return !!controle?.touched && controle.hasError(erro);
  }

  async enviar(): Promise<void> {
    if (this.enviando()) return;

    this.tentouEnviar.set(true);
    this.form.markAllAsTouched();
    Object.values(this.form.controls).forEach((controle) => controle.markAsDirty());
    this.resultado.set(null);
    if (this.form.invalid) return;

    const valor = this.form.getRawValue();
    this.enviando.set(true);

    try {
      const job = await this.gerentes.criar({
        cpf: soDigitos(valor.cpf ?? ''),
        nome: (valor.nome ?? '').trim(),
        email: (valor.email ?? '').trim(),
        telefone: soDigitos(valor.telefone ?? ''),
        senha: valor.senha ?? '',
      });
      const fim = await this.jobs.aguardar(job.jobId);

      if (fim.status === 'FALHA') {
        this.resultado.set({ status: 'FALHA', mensagem: mensagemDeErro(fim) });
        return;
      }

      const criado = await this.jobs.resultado<Gerente>(fim);
      this.resultado.set({
        status: 'SUCESSO',
        mensagem: `O gerente ${criado.nome} foi cadastrado.`,
      });
    } catch (erro) {
      this.resultado.set({
        status: erro instanceof TempoEsgotadoError ? 'TIMEOUT' : 'FALHA',
        mensagem: mensagemDeErro(erro),
      });
    } finally {
      this.enviando.set(false);
    }
  }

  fecharResultado(): void {
    const sucesso = this.resultado()?.status === 'SUCESSO';
    this.resultado.set(null);
    if (sucesso) {
      void this.router.navigate(['/gerente/gerentes'], { state: { aguardarProjecao: true } });
    }
  }

  private digitos(quantidade: number) {
    return (controle: AbstractControl): ValidationErrors | null => {
      const valor = soDigitos(String(controle.value ?? ''));
      if (!valor) return null;
      return valor.length === quantidade ? null : { quantidadeDigitos: true };
    };
  }

  private digitosEntre(minimo: number, maximo: number) {
    return (controle: AbstractControl): ValidationErrors | null => {
      const valor = soDigitos(String(controle.value ?? ''));
      if (!valor) return null;
      return valor.length >= minimo && valor.length <= maximo
        ? null
        : { quantidadeDigitosEntre: true };
    };
  }
}
/* comentando groselha
 * Inserir gerente. Esta tela pertence ao perfil gerente e o envio so
 * segue quando nome, CPF, e-mail, telefone e senha passam na validacao
 * local. O CPF precisa ter 11 digitos, sem digito verificador. O telefone
 * precisa ter 10 ou 11 digitos. A mascara e removida com soDigitos antes
 * do POST. O nome vai trimado. O e-mail tambem vai trimado e vira o login.
 * A senha e definida neste formulario. Ela nao e disparada por e-mail.
 * Se o formulario esta invalido, tentouEnviar fica verdadeiro. Os controles
 * sao marcados como touched e como dirty, e enviar retorna sem chamar a
 * API. O rodape troca o texto para "Corrija os campos destacados". A borda
 * vermelha e do PrimeNG, que usa dirty. O texto de erro de cada campo usa
 * touched. Por isso o clique marca os dois estados de uma vez.
 * enviando bloqueia um segundo submit enquanto o primeiro ainda espera.
 * Cancelar tambem fica desabilitado nesse intervalo. O POST sai de
 * GerenteService.criar para /gerentes, sempre pelo gateway local, na
 * porta 8000. O corpo leva cpf, nome, email, telefone e senha.
 * A resposta imediata e 202 Accepted, com um jobId. O gerente ainda nao
 * esta pronto nesse momento. O orquestrador abre a saga de tipo
 * inserir-gerente, no dominio gerentes, e o recurso dela e o CPF.
 * A tela fica em jobs.aguardar. O componente app-job-progress mostra
 * "Cadastrando gerente…" enquanto enviando e verdadeiro. A conclusao
 * nao e um saldo recalculado na tela: ela chega pelo status do job.
 * A saga executa seis passos, cada um na fila de comando do seu MS.
 * 1. MS Gerente grava cpf, nome, email e telefone. Se um passo seguinte
 * falhar, compensar-inserir-gerente apaga esse cadastro pelo CPF.
 * 2. MS Auth cria o usuario. O login e o e-mail, o tipo e GERENTE e a
 * senha e a digitada aqui. compensar-criar-usuario remove esse CPF.
 * 3. MS Conta consulta conta-a-transferir. A regra recolhe uma conta do
 * gerente que ja tem mais contas, e somente se ele tiver mais de uma.
 * Sem conta elegivel, transferir fica falso e os passos 4, 5 e 6 param.
 * 4. MS Conta executa atribuir-conta, ligando numeroConta ao CPF novo.
 * A compensacao devolve a conta ao cpfGerenteAnterior.
 * 5. MS Cliente faz obter-clientes-por-cpf, com o CPF do dono da conta
 * que acabou de mudar de gerente. So roda se houve transferencia.
 * 6. MS Email manda email.gerente-alterado para esse cliente, citando o
 * nome do gerente novo. A saga nao tem e-mail de falha.
 * Se o job fecha com FALHA, a tela mostra a mensagem do resultado e
 * permanece nesta rota. Se a espera estoura, o catch reconhece
 * TempoEsgotadoError e grava o status TIMEOUT. Outra excecao vira
 * FALHA, com o texto de mensagemDeErro. O finally zera enviando, entao
 * o botao Cadastrar gerente solta o loading nos tres desfechos.
 * No sucesso, jobs.resultado le o Gerente gravado. A frase exibida e
 * "O gerente {nome} foi cadastrado." Fechar o aviso navega para
 * /gerente/gerentes e manda state aguardarProjecao verdadeiro. A lista
 * reconsulta ate a projecao de leitura mostrar o registro inserido.
 * Ao terminar, o cache cache:gerente:{cpf} e invalidado. Se uma conta
 * trocou de dono, cache:gerente:{cpfGerenteAnterior} tambem e removido,
 * para a carteira antiga nao seguir exibindo essa conta.
 * O card ao lado da tela resume os tres efeitos visiveis: gravar o
 * gerente, criar o login e, quando couber, redistribuir uma conta com
 * aviso por e-mail. Os passos 3 a 6 da saga sao o detalhe desse terceiro
 * efeito. Nenhum deles soma saldo no navegador.
 * A listagem so muda depois da projecao. Por isso o state
 * aguardarProjecao existe: o insert responde antes da leitura atualizar.
 * Sem essa reconsulta, o gerente novo pode faltar na tabela por um
 * instante, mesmo com a saga ja concluida em SUCESSO.
 * CPF e telefone invalidos nem chegam ao gateway. E-mail duplicado e
 * falha de saga passam pelo job, depois do 202, e aparecem no aviso
 * de FALHA desta mesma tela.
 */