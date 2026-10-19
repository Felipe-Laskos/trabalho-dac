import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { signal, type Signal, type WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Conta, Extrato } from '../../../core/models/conta.model';
import type { Usuario } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auth.service';
import { ContaService } from '../../../core/services/conta.service';
import { ExtratoService } from '../../../core/services/extrato.service';
import { ExtratoComponent } from './extrato.component';

const CPF = '11111111111';

const contaMock: Conta = {
  numero: '1291',
  cpfCliente: CPF,
  cpfGerente: '22222222222',
  saldo: '1000.00' as Conta['saldo'],
  dataCriacao: '2020-01-01',
  _links: {},
};

const extratoMock: Extrato = {
  numeroConta: '1291',
  dataInicio: '2020-01-20',
  dataFim: '2020-01-22',
  saldoAbertura: '1000.00' as Extrato['saldoAbertura'],
  movimentacoes: [],
  _links: {},
};

type ExtratoInterno = {
  estado: Signal<'carregando' | 'pronto' | 'erro'>;
  conta: Signal<Conta | null>;
  extrato: Signal<Extrato | null>;
  dias: Signal<unknown[]>;
  consultando: Signal<boolean>;
  mensagemErro: Signal<string>;
  mensagemValidacao: Signal<string>;
  inicioSelecionado: WritableSignal<Date | null>;
  fimSelecionado: WritableSignal<Date | null>;
  consultar(): Promise<void>;
  carregar(): Promise<void>;
};

describe('ExtratoComponent', () => {
  let fixture: ComponentFixture<ExtratoComponent>;
  let usuario: WritableSignal<Usuario | null>;

  let contaServiceMock: {
    obterPorCliente: ReturnType<typeof vi.fn>;
  };

  let extratoServiceMock: {
    consultar: ReturnType<typeof vi.fn>;
  };

  function componente(): ExtratoInterno {
    return fixture.componentInstance as unknown as ExtratoInterno;
  }

  async function criarComponente(): Promise<void> {
    fixture = TestBed.createComponent(ExtratoComponent);
    fixture.detectChanges();

    await fixture.whenStable();

    fixture.detectChanges();
  }

  beforeEach(async () => {
    usuario = signal<Usuario | null>({
      cpf: CPF,
      nome: 'Cliente de teste',
    } as Usuario);

    contaServiceMock = {
      obterPorCliente: vi.fn().mockResolvedValue(contaMock),
    };

    extratoServiceMock = {
      consultar: vi.fn().mockResolvedValue(extratoMock),
    };

    await TestBed.configureTestingModule({
      imports: [ExtratoComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { usuario },
        },
        {
          provide: ContaService,
          useValue: contaServiceMock,
        },
        {
          provide: ExtratoService,
          useValue: extratoServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('deve criar o componente', async () => {
    await criarComponente();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve carregar a conta e consultar o período padrão', async () => {
    await criarComponente();

    expect(contaServiceMock.obterPorCliente).toHaveBeenCalledWith(CPF);
    expect(extratoServiceMock.consultar).toHaveBeenCalledTimes(1);
    expect(extratoServiceMock.consultar).toHaveBeenCalledWith(
      contaMock.numero,
      expect.anything(),
      expect.anything(),
    );

    expect(componente().estado()).toBe('pronto');
    expect(componente().conta()).toEqual(contaMock);
    expect(componente().extrato()).toEqual(extratoMock);
    expect(componente().consultando()).toBe(false);
  });

  it('deve exibir erro quando não houver CPF na sessão', async () => {
    usuario.set(null);

    await criarComponente();

    expect(componente().estado()).toBe('erro');
    expect(componente().mensagemErro()).toBe('Não encontramos o CPF da sessão.');
    expect(contaServiceMock.obterPorCliente).not.toHaveBeenCalled();
    expect(extratoServiceMock.consultar).not.toHaveBeenCalled();
  });

  it('deve exibir erro quando não conseguir carregar a conta', async () => {
    contaServiceMock.obterPorCliente.mockRejectedValue(new Error('Falha ao carregar conta'));

    await criarComponente();

    expect(componente().estado()).toBe('erro');
    expect(componente().conta()).toBeNull();
    expect(componente().mensagemErro()).toBeTruthy();
    expect(extratoServiceMock.consultar).not.toHaveBeenCalled();
  });

  it('deve exibir a tela de erro com opção de tentar novamente', async () => {
    contaServiceMock.obterPorCliente.mockRejectedValue(new Error('Falha ao carregar conta'));

    await criarComponente();

    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Tentar novamente');
  });

  it('deve validar quando as datas não forem selecionadas', async () => {
    await criarComponente();

    const interno = componente();

    interno.inicioSelecionado.set(null);
    interno.fimSelecionado.set(null);

    extratoServiceMock.consultar.mockClear();

    await interno.consultar();

    expect(interno.mensagemValidacao()).toBe('Selecione a data inicial e a data final.');
    expect(extratoServiceMock.consultar).not.toHaveBeenCalled();
  });

  it('deve rejeitar um período superior a 365 dias', async () => {
    await criarComponente();

    const interno = componente();

    interno.inicioSelecionado.set(new Date(2020, 0, 1));
    interno.fimSelecionado.set(new Date(2021, 0, 1));

    extratoServiceMock.consultar.mockClear();

    await interno.consultar();

    expect(interno.mensagemValidacao()).toBe('Informe um período válido de até 365 dias.');
    expect(extratoServiceMock.consultar).not.toHaveBeenCalled();
  });

  it('deve consultar o extrato para um período válido', async () => {
    await criarComponente();

    const interno = componente();

    interno.inicioSelecionado.set(new Date(2020, 0, 20));
    interno.fimSelecionado.set(new Date(2020, 0, 22));

    extratoServiceMock.consultar.mockClear();

    await interno.consultar();

    expect(extratoServiceMock.consultar).toHaveBeenCalledTimes(1);
    expect(extratoServiceMock.consultar).toHaveBeenCalledWith(
      contaMock.numero,
      expect.anything(),
      expect.anything(),
    );

    expect(interno.extrato()).toEqual(extratoMock);
    expect(interno.mensagemValidacao()).toBe('');
    expect(interno.consultando()).toBe(false);
  });

  it('deve exibir erro quando a consulta do extrato falhar', async () => {
    extratoServiceMock.consultar.mockRejectedValue(new Error('Falha ao consultar extrato'));

    await criarComponente();

    expect(componente().estado()).toBe('pronto');
    expect(componente().mensagemErro()).toBeTruthy();
    expect(componente().consultando()).toBe(false);
  });

  it('deve limpar o extrato anterior antes de uma nova consulta', async () => {
    await criarComponente();

    const interno = componente();

    interno.inicioSelecionado.set(new Date(2020, 0, 20));
    interno.fimSelecionado.set(new Date(2020, 0, 22));

    extratoServiceMock.consultar.mockClear();

    await interno.consultar();

    expect(interno.extrato()).toEqual(extratoMock);
    expect(interno.dias().length).toBe(3);
  });
});
