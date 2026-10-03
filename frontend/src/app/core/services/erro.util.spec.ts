import { HttpErrorResponse } from '@angular/common/http';
import { mensagemDeErro, tratarErro } from './erro.util';
import type { Job } from '../models/job.model';

function http(status: number, mensagem?: string, extra?: object): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: 'Error',
    error: mensagem
      ? { status, erro: 'Error', mensagem, ...extra }
      : extra ?? {},
  });
}

describe('tratarErro / mensagemDeErro', () => {
  it('400 usa a mensagem do back e extrai campos', () => {
    const erro = http(400, 'Dados inválidos', {
      fields: [{ field: 'cpf', message: 'CPF inválido' }],
    });
    const tratado = tratarErro(erro);
    expect(tratado.status).toBe(400);
    expect(tratado.mensagem).toBe('Dados inválidos');
    expect(tratado.campos['cpf']).toBe('CPF inválido');
  });

  it('401 usa mensagem de sessão', () => {
    expect(mensagemDeErro(http(401))).toBe('Sua sessão expirou. Entre novamente.');
  });

  it('403 usa mensagem do back quando vier no corpo', () => {
    expect(mensagemDeErro(http(403, 'Gerente não pode ver esta conta.'))).toBe(
      'Gerente não pode ver esta conta.',
    );
  });

  it('404 usa mensagem do back quando vier no corpo', () => {
    expect(mensagemDeErro(http(404, 'Job inexistente ou expirado'))).toBe(
      'Job inexistente ou expirado',
    );
  });

  it('422 mostra a mensagem do back sem reescrever', () => {
    expect(mensagemDeErro(http(422, 'Saldo insuficiente.'))).toBe('Saldo insuficiente.');
  });

  it('5xx usa mensagem de sistema', () => {
    expect(mensagemDeErro(http(500))).toBe('Não foi possível concluir a operação.');
  });

  it('job FALHA mostra o erro do back', () => {
    const job: Job = {
      jobId: 'j1',
      status: 'FALHA',
      resultType: null,
      dominio: null,
      resourceId: null,
      erro: 'A solicitação já foi aprovada.',
    };
    expect(mensagemDeErro(job)).toBe('A solicitação já foi aprovada.');
  });
});
