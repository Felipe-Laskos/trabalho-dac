import { Pipe, type PipeTransform } from '@angular/core';
import { mascararCpf } from '../util/mascara.util';

@Pipe({ name: 'cpf' })
export class CpfPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor?.trim()) return '\u2014';

    const digitos = valor.replace(/\D/g, '');

    if (digitos.length !== 11) return '\u2014';

    return mascararCpf(digitos);
  }
}
