import { TestBed } from '@angular/core/testing';
import { OperacaoService } from './operacao.service';
import { ApiService } from './api.service';

describe('OperacaoService', () => {
  let service: OperacaoService;
  const api = {
    post: vi.fn().mockResolvedValue({ tipo: 'DEPOSITO' }),
  };

  beforeEach(() => {
    api.post.mockClear();
    TestBed.configureTestingModule({
      providers: [OperacaoService, { provide: ApiService, useValue: api }],
    });
    service = TestBed.inject(OperacaoService);
  });

  it('depositar POSTa valor em /contas/{numero}/deposito', async () => {
    await service.depositar('1291', '150.00');
    expect(api.post).toHaveBeenCalledWith('/contas/1291/deposito', { valor: '150.00' });
  });

  it('sacar POSTa valor em /contas/{numero}/saque', async () => {
    await service.sacar('1291', '50.00');
    expect(api.post).toHaveBeenCalledWith('/contas/1291/saque', { valor: '50.00' });
  });

  it('transferir POSTa contaDestino e valor', async () => {
    await service.transferir('1291', { contaDestino: '0950', valor: '30.00' });
    expect(api.post).toHaveBeenCalledWith('/contas/1291/transferencia', {
      contaDestino: '0950',
      valor: '30.00',
    });
  });
});
