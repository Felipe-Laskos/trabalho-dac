import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Parametros = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  get<T>(caminho: string, parametros?: Parametros): Promise<T> {
    return firstValueFrom(
      this.http.get<T>(this.url(caminho), { params: this.montarParams(parametros) }),
    );
  }

  post<T>(caminho: string, corpo: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(caminho), corpo));
  }

  /** POST que espera 204 sem corpo JSON (logout). */
  postVazio(caminho: string): Promise<void> {
    return firstValueFrom(
      this.http.post(this.url(caminho), {}, { observe: 'response', responseType: 'text' }),
    ).then(() => undefined);
  }

  put<T>(caminho: string, corpo: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(caminho), corpo));
  }

  delete<T>(caminho: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(caminho)));
  }

  private url(caminho: string): string {
    return `${this.base}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
  }

  private montarParams(parametros?: Parametros): HttpParams | undefined {
    if (!parametros) return undefined;
    return Object.entries(parametros).reduce(
      (params, [chave, valor]) => params.set(chave, valor),
      new HttpParams(),
    );
  }
}
