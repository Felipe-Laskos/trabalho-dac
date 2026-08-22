import { Pipe, type PipeTransform } from '@angular/core';
import { mascararCpf } from '../util/mascara.util';

@Pipe({ name: 'cpf' })
export class CpfPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return valor ? mascararCpf(valor) : '—';
  }
}
