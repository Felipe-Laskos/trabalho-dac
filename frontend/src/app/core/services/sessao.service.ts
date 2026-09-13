import { Injectable, computed, signal } from '@angular/core';
import type { TipoUsuario, Usuario } from '../models/auth.model';

const CHAVE_TOKEN = 'bantads.token';
const CHAVE_TIPO = 'bantads.tipo';
const CHAVE_USUARIO = 'bantads.usuario';

@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly _token = signal<string | null>(lerTexto(CHAVE_TOKEN));
  private readonly _tipo = signal<TipoUsuario | null>(lerTipo(CHAVE_TIPO));
  private readonly _usuario = signal<Usuario | null>(lerUsuario(CHAVE_USUARIO));

  readonly token = this._token.asReadonly();
  readonly tipo = this._tipo.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(
    () => this._token() !== null && this._tipo() !== null && this._usuario() !== null,
  );

  gravar(token: string, tipo: TipoUsuario, usuario: Usuario): void {
    this._token.set(token);
    this._tipo.set(tipo);
    this._usuario.set(usuario);
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_TIPO, tipo);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  }

  limparSessao(): void {
    this._token.set(null);
    this._tipo.set(null);
    this._usuario.set(null);
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_TIPO);
    localStorage.removeItem(CHAVE_USUARIO);
  }
}

function lerTexto(chave: string): string | null {
  return localStorage.getItem(chave);
}

function lerTipo(chave: string): TipoUsuario | null {
  const valor = localStorage.getItem(chave);
  return valor === 'CLIENTE' || valor === 'GERENTE' ? valor : null;
}

function lerUsuario(chave: string): Usuario | null {
  const bruto = localStorage.getItem(chave);
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as Partial<Usuario>;
    if (
      typeof lido.cpf === 'string' &&
      typeof lido.nome === 'string' &&
      typeof lido.email === 'string'
    ) {
      return { cpf: lido.cpf, nome: lido.nome, email: lido.email };
    }
  } catch {
    return null;
  }
  return null;
}
