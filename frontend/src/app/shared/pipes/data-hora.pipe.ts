import { Pipe, type PipeTransform } from '@angular/core';
import { exibirData, exibirDataHora } from '../util/data.util';

@Pipe({ name: 'dataHora' })
export class DataHoraPipe implements PipeTransform {
  transform(iso: string | null | undefined, formato: 'completo' | 'data' = 'completo'): string {
    if (!iso) return '—';
    return formato === 'data' ? exibirData(iso) : exibirDataHora(iso);
  }
}
