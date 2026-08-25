import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { LoginInput, LoginResponse, TipoUsuario, Usuario } from '../models/auth.model';
import { ApiService } from './api.service';
import { SessaoService } from './sessao.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly sessao = inject(SessaoService);

  readonly token = this.sessao.token;
  readonly tipo = this.sessao.tipo;
  readonly usuario = this.sessao.usuario;
  readonly autenticado = this.sessao.autenticado;

  async entrar(email: string, senha: string): Promise<LoginResponse> {
    const corpo: LoginInput = { email: email.trim(), senha };
    const resposta = await this.api.post<LoginResponse>('/login', corpo);

    if (!resposta.auth || !resposta.token || !resposta.tipo || !resposta.usuario) {
      throw new Error('Resposta de login incompleta.');
    }

    this.sessao.gravar(resposta.token, resposta.tipo, resposta.usuario);
    return resposta;
  }

  async sair(): Promise<void> {
    try {
      if (this.sessao.token()) {
        await this.api.postVazio('/logout');
      }
    } catch (erro) {
      if (!(erro instanceof HttpErrorResponse) || erro.status !== 401) {
        console.warn('Logout remoto falhou; a sessão local será encerrada mesmo assim.', erro);
      }
    } finally {
      this.sessao.limparSessao();
    }
  }

  rotaInicial(tipo: TipoUsuario | null = this.sessao.tipo()): string {
    return tipo === 'GERENTE' ? '/gerente/solicitacoes' : '/cliente/home';
  }

  ehPerfil(esperado: TipoUsuario): boolean {
    return this.sessao.tipo() === esperado;
  }

  nomeExibicao(): string {
    return this.sessao.usuario()?.nome ?? '';
  }

  usuarioAtual(): Usuario | null {
    return this.sessao.usuario();
  }
}
