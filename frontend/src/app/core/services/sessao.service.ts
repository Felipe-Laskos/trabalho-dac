import { Injectable, computed, signal } from '@angular/core';

const CHAVE_TOKEN = 'bantads.token';

@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly _token = signal<string | null>(localStorage.getItem(CHAVE_TOKEN));

  readonly token = this._token.asReadonly();
  readonly autenticado = computed(() => this._token() !== null);

  definirToken(token: string): void {
    this._token.set(token);
    localStorage.setItem(CHAVE_TOKEN, token);
  }

  limparSessao(): void {
    this._token.set(null);
    localStorage.removeItem(CHAVE_TOKEN);
  }
}
