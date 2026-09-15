import { TestBed } from '@angular/core/testing';
import { ContaService } from './conta.service';
import { ApiService } from './api.service';
import type { Conta } from '../models/conta.model';

const conta800: Conta = {
  numero: '1291',
  cpfCliente: '12912861012',
  cpfGerente: '98574307084',
  saldo: '800.00',
  dataCriacao: '2000-01-01',
  _links: {},
};

describe('ContaService', () => {
  it('aguardarNovoSaldo usa GET /contas/{numero} e para quando o saldo muda', async () => {
    const api = {
      get: vi
        .fn()
        .mockResolvedValueOnce(conta800)
        .mockResolvedValueOnce({ ...conta800, saldo: '950.00' }),
    };

    TestBed.configureTestingModule({
      providers: [ContaService, { provide: ApiService, useValue: api }],
    });

    const service = TestBed.inject(ContaService);
    const resultado = await service.aguardarNovoSaldo('1291', '800.00', 5_000);

    expect(api.get).toHaveBeenCalledWith('/contas/1291');
    expect(resultado.convergiu).toBe(true);
    expect(resultado.conta.saldo).toBe('950.00');
  });
});
