import { caminhoDoHref, temRel } from './hateoas.util';

describe('hateoas.util', () => {
  it('temRel só é verdadeiro quando o href existe', () => {
    expect(temRel({ aprovacao: { href: '/x' } }, 'aprovacao')).toBe(true);
    expect(temRel({ aprovacao: { href: '/x' } }, 'rejeicao')).toBe(false);
    expect(temRel({}, 'aprovacao')).toBe(false);
  });

  it('caminhoDoHref extrai o path de URL absoluta', () => {
    expect(caminhoDoHref('http://localhost:8000/solicitacoes/1/aprovacao')).toBe(
      '/solicitacoes/1/aprovacao',
    );
    expect(caminhoDoHref('/solicitacoes/1/aprovacao')).toBe('/solicitacoes/1/aprovacao');
  });
});
