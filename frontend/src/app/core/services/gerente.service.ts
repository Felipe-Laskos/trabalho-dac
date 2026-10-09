
import { Injectable } from '@angular/core';

import type {
  Gerente,
  GerenteUpdate,
  GerentesList,
} from '../models/gerente.model';

const GERENTES_MOCK: Gerente[] = [
  {
    cpf: '98574307084',
    nome: 'Geniéve',
    email: 'ger1@bantads.com.br',
    telefone: '41999999999',
    ativo: true,
    quantidadeClientes: 2,
    _links: {
      self: { href: '/gerentes/98574307084' },
      atualizacao: { href: '/gerentes/98574307084' },
      remocao: { href: '/gerentes/98574307084' },
    },
  },
  {
    cpf: '64065268052',
    nome: 'Godophredo',
    email: 'ger2@bantads.com.br',
    telefone: '41998999999',
    ativo: true,
    quantidadeClientes: 2,
    _links: {
      self: { href: '/gerentes/64065268052' },
      atualizacao: { href: '/gerentes/64065268052' },
      remocao: { href: '/gerentes/64065268052' },
    },
  },
  {
    cpf: '23862179060',
    nome: 'Gyândula',
    email: 'ger3@bantads.com.br',
    telefone: '41997999999',
    ativo: true,
    quantidadeClientes: 1,
    _links: {
      self: { href: '/gerentes/23862179060' },
      atualizacao: { href: '/gerentes/23862179060' },
      remocao: { href: '/gerentes/23862179060' },
    },
  },
  {
    cpf: '40501740066',
    nome: 'Gadamântio',
    email: 'ger4@bantads.com.br',
    telefone: '41996999999',
    ativo: true,
    quantidadeClientes: 0,
    _links: {
      self: { href: '/gerentes/40501740066' },
      atualizacao: { href: '/gerentes/40501740066' },
      remocao: { href: '/gerentes/40501740066' },
    },
  },
];

@Injectable({
  providedIn: 'root',
})
export class GerenteService {
  async listar(): Promise<GerentesList> {
    return {
      gerentes: GERENTES_MOCK.map((gerente) => ({
        ...gerente,
        _links: { ...gerente._links },
      })),
      _links: {
        self: { href: '/gerentes' },
      },
    };
  }

  async buscar(cpf: string): Promise<Gerente> {
    const gerente = GERENTES_MOCK.find((item) => item.cpf === cpf);

    if (!gerente) {
      throw new Error('Gerente não encontrado.');
    }

    return {
      ...gerente,
      _links: { ...gerente._links },
    };
  }

  async atualizar(
    href: string,
    dados: GerenteUpdate,
  ): Promise<Gerente> {
    const indice = GERENTES_MOCK.findIndex(
      (gerente) => gerente._links?.['atualizacao']?.href === href,
    );

    if (indice === -1) {
      throw new Error('Link de atualização do gerente não encontrado.');
    }

    const gerenteAtual = GERENTES_MOCK[indice];

    GERENTES_MOCK[indice] = {
      ...gerenteAtual,
      nome: dados.nome,
      telefone: dados.telefone,
    };

    return {
      ...GERENTES_MOCK[indice],
      _links: { ...GERENTES_MOCK[indice]._links },
    };
  }
}