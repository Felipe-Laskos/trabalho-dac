import type { Links } from '../../core/models/comum.model';

export function caminhoDoHref(href: string): string {
  if (!href) {
    return '';
  }
  try {
    if (/^https?:\/\//i.test(href)) {
      const url = new URL(href);
      return url.pathname + url.search;
    }
  } catch {
    // href relativo malformado: usa o valor como caminho
  }
  return href.startsWith('/') ? href : `/${href}`;
}

export function temRel(links: Links | null | undefined, rel: string): boolean {
  return !!links?.[rel]?.href;
}
