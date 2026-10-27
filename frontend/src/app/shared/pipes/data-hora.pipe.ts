import { Pipe, type PipeTransform } from '@angular/core';
import { exibirData, exibirDataHora } from '../util/data.util';

@Pipe({ name: 'dataHora' })
export class DataHoraPipe implements PipeTransform {
  transform(
    iso: string | null | undefined,
    formato: 'completo' | 'data' = 'completo',
  ): string {
    if (!iso?.trim()) return '\u2014';

    return formato === 'data'
      ? exibirData(iso)
      : exibirDataHora(iso);
  }
}
