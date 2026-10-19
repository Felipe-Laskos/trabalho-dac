import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { ExtratoService } from './extrato.service';

describe('ExtratoService', () => {
  let service: ExtratoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ExtratoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('consulta o extrato com número da conta e período informado', async () => {
    const inicio = DateTime.fromISO('2020-01-01');
    const fim = DateTime.fromISO('2020-01-31');

    const resposta = {
      numeroConta: '1291',
      dataInicio: '2020-01-01',
      dataFim: '2020-01-31',
      saldoAbertura: '1000.00',
      movimentacoes: [],
      _links: {},
    };

    const resultadoPromise = service.consultar('1291', inicio, fim);

    const requisicao = httpMock.expectOne(
      (req) =>
        req.url === `${environment.apiUrl}/contas/1291/extrato` &&
        req.params.get('inicio') === '2020-01-01' &&
        req.params.get('fim') === '2020-01-31',
    );

    expect(requisicao.request.method).toBe('GET');

    requisicao.flush(resposta);

    await expect(resultadoPromise).resolves.toEqual(resposta);
  });

  it('codifica o número da conta no caminho da requisição', async () => {
    const resultadoPromise = service.consultar(
      '12/91',
      DateTime.fromISO('2020-01-01'),
      DateTime.fromISO('2020-01-31'),
    );

    const requisicao = httpMock.expectOne(
      (req) => req.url === `${environment.apiUrl}/contas/12%2F91/extrato`,
    );

    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('inicio')).toBe('2020-01-01');
    expect(requisicao.request.params.get('fim')).toBe('2020-01-31');

    requisicao.flush({
      numeroConta: '12/91',
      dataInicio: '2020-01-01',
      dataFim: '2020-01-31',
      saldoAbertura: '0.00',
      movimentacoes: [],
      _links: {},
    });

    await resultadoPromise;
  });
});
