import { HttpErrorResponse } from '@angular/common/http';
import type { Erro } from '../models/comum.model';

export function normalizarErro(e: HttpErrorResponse): Erro {
  const corpo = e.error as Partial<Erro> | string | null;

  if (corpo && typeof corpo === 'object' && typeof corpo.mensagem === 'string') {
    return {
      status: corpo.status ?? e.status,
      erro: corpo.erro ?? e.statusText,
      mensagem: corpo.mensagem,
    };
  }

  return { status: e.status, erro: e.statusText, mensagem: mensagemPadrao(e.status) };
}

export function mensagemDeErro(e: unknown): string {
  if (e instanceof HttpErrorResponse) return normalizarErro(e).mensagem;
  if (e instanceof Error) return e.message;
  return 'Não foi possível concluir a operação.';
}

function mensagemPadrao(status: number): string {
  switch (status) {
    case 0:
      return 'Não foi possível falar com o servidor.';
    case 401:
      return 'Sua sessão expirou. Entre novamente.';
    case 403:
      return 'Você não tem permissão para esta operação.';
    case 404:
      return 'Não encontramos o que você pediu.';
    default:
      return 'Não foi possível concluir a operação.';
  }
}
