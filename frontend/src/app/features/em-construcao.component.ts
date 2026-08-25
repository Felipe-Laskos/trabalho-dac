import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

// Componente para somente preencher rotas que ainda não tem componente pronto
// TODO - Remover este componente quanto nenhuma rota estiver utilizando
@Component({
  selector: 'app-em-construcao',
  template: `
    <section>
      <h2>Em construção</h2>
      <p>Rota <code>/{{ caminho }}</code>.</p>
    </section>
  `,
  styles: `
    section {
      padding: var(--spacing-xl);
      background: var(--color-surface);
      border: 1px dashed var(--color-border);
      border-radius: var(--border-radius);
      color: var(--color-text-secondary);
    }
    h2 {
      margin: 0 0 var(--spacing-sm);
      color: var(--color-text);
      font-weight: var(--font-weight-heading);
    }
    p { margin: 0; }
  `,
})
export class EmConstrucaoComponent {
  private readonly rota = inject(ActivatedRoute);
  protected readonly caminho = this.rota.snapshot.pathFromRoot
    .flatMap((r) => r.url.map((s) => s.path))
    .join('/');
}
