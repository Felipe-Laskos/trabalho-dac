import type { Links } from '../../core/models/comum.model';

export interface AcaoConta {
  rel: string;
  href: string;
  label: string;
  descricao: string;
  icone: string;
  rota: string;
  tom: 'blue' | 'red' | 'teal' | 'gray';
}

const CATALOGO: Record<string, Omit<AcaoConta, 'rel' | 'href'>> = {
  deposito: {
    label: 'Depositar',
    descricao: 'Entrada de dinheiro na sua conta',
    icone: 'pi pi-arrow-down',
    rota: '/cliente/deposito',
    tom: 'blue',
  },
  saque: {
    label: 'Sacar',
    descricao: 'Até o limite do seu saldo',
    icone: 'pi pi-arrow-up',
    rota: '/cliente/saque',
    tom: 'red',
  },
  transferencia: {
    label: 'Transferir',
    descricao: 'Para outra conta do BANTADS',
    icone: 'pi pi-arrow-right-arrow-left',
    rota: '/cliente/transferencia',
    tom: 'teal',
  },
  extrato: {
    label: 'Ver extrato',
    descricao: 'Últimos 30 dias, dia a dia',
    icone: 'pi pi-file',
    rota: '/cliente/extrato',
    tom: 'gray',
  },
};

/** Só entra no menu o rel que a API devolveu em `_links`. */
export function acoesDaConta(links: Links | null | undefined): AcaoConta[] {
  if (!links) {
    return [];
  }

  return Object.entries(CATALOGO)
    .filter(([rel]) => !!links[rel]?.href)
    .map(([rel, meta]) => ({
      rel,
      href: links[rel].href,
      ...meta,
    }));
}
