import { HttpErrorResponse } from '@angular/common/http';
import type { Erro } from '../models/comum.model';
import type { Job } from '../models/job.model';

export interface ErroTratado {
  status: number;
  mensagem: string;
  campos: Record<string, string>;
}

export function extrairCamposInvalidos(corpo: unknown): Record<string, string> {
  const resultado: Record<string, string> = {};
  if (!corpo || typeof corpo !== 'object') {
    return resultado;
  }

  const origem = corpo as Record<string, unknown>;
  if (origem['campos'] && typeof origem['campos'] === 'object' && !Array.isArray(origem['campos'])) {
    for (const [campo, mensagem] of Object.entries(origem['campos'] as Record<string, unknown>)) {
      resultado[campo] = String(mensagem);
    }
  }

  const bruto = origem['fields'] ?? origem['errors'] ?? origem['fieldErrors'];
  if (Array.isArray(bruto)) {
    for (const item of bruto) {
      if (item && typeof item === 'object' && 'field' in item) {
        const campo = String((item as { field: unknown }).field);
        const mensagem = (item as { message?: unknown }).message;
        resultado[campo] = typeof mensagem === 'string' ? mensagem : 'Campo inválido.';
      }
    }
  } else if (bruto && typeof bruto === 'object') {
    for (const [campo, mensagem] of Object.entries(bruto as Record<string, unknown>)) {
      resultado[campo] = String(mensagem);
    }
  }

  return resultado;
}

export function normalizarErro(e: HttpErrorResponse): Erro {
  const corpo = e.error as Partial<Erro> | string | null;
  const campos = extrairCamposInvalidos(e.error);

  if (corpo && typeof corpo === 'object') {
    if (typeof corpo.mensagem === 'string') {
      return {
        status: corpo.status ?? e.status,
        erro: corpo.erro ?? e.statusText,
        mensagem: corpo.mensagem,
        ...(Object.keys(campos).length ? { campos } : {}),
      };
    }

    const avisoLogin = (corpo as { message?: string }).message;
    if (typeof avisoLogin === 'string' && avisoLogin.length > 0) {
      return {
        status: e.status,
        erro: 'NaoAutorizado',
        mensagem: avisoLogin,
        ...(Object.keys(campos).length ? { campos } : {}),
      };
    }
  }

  return {
    status: e.status,
    erro: e.statusText,
    mensagem: mensagemPadrao(e.status),
    ...(Object.keys(campos).length ? { campos } : {}),
  };
}

export function tratarErro(e: unknown): ErroTratado {
  if (ehJob(e) && e.status === 'FALHA') {
    return {
      status: 0,
      mensagem: e.erro ?? mensagemPadrao(500),
      campos: {},
    };
  }

  if (e instanceof HttpErrorResponse) {
    const normalizado = normalizarErro(e);
    return {
      status: e.status,
      mensagem: normalizado.mensagem,
      campos: normalizado.campos ?? {},
    };
  }

  if (e instanceof Error && e.message) {
    return { status: 0, mensagem: e.message, campos: {} };
  }

  return { status: 0, mensagem: mensagemPadrao(500), campos: {} };
}

export function mensagemDeErro(e: unknown): string {
  return tratarErro(e).mensagem;
}

function ehJob(v: unknown): v is Job {
  return (
    !!v &&
    typeof v === 'object' &&
    'jobId' in v &&
    'status' in v &&
    'resultType' in v
  );
}

function mensagemPadrao(status: number): string {
  switch (status) {
    case 0:
      return 'Não foi possível falar com o servidor.';
    case 400:
      return 'Verifique os campos destacados.';
    case 401:
      return 'Sua sessão expirou. Entre novamente.';
    case 403:
      return 'Você não tem permissão para esta operação.';
    case 404:
      return 'Não encontramos o que você pediu.';
    case 422:
      return 'A operação não foi aceita.';
    default:
      return 'Não foi possível concluir a operação.';
  }
}
