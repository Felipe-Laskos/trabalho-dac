import { Pipe, type PipeTransform } from '@angular/core';
import { formatarBRL } from '../util/dinheiro.util';
import type { Dinheiro } from '../../core/models/dinheiro';

@Pipe({ name: 'dinheiro' })
export class DinheiroPipe implements PipeTransform {
  transform(valor: Dinheiro | null | undefined): string {
    return valor ? formatarBRL(valor) : 'R$ 0,00';
  }
}
