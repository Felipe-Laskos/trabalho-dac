import type { Links } from '../../core/models/comum.model';

export function caminhoDoHref(href: string): string {
  if (!href) {
    return '';
  }
  try {
    if (/^https?:\/\//i.test(href)) {
      return new URL(href).pathname;
    }
  } catch {
    // href relativo malformado: usa o valor como caminho
  }
  return href.startsWith('/') ? href : `/${href}`;
}

export function temRel(links: Links | null | undefined, rel: string): boolean {
  return !!links?.[rel]?.href;
}
