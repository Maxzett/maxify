import { Pipe, PipeTransform } from '@angular/core';

// Corta un texto largo sin partir palabras y agrega "…".
//   {{ publicacion.mensaje | truncar: 180 }}
@Pipe({ name: 'truncar' })
export class TruncarPipe implements PipeTransform {
  transform(texto: string | null | undefined, maximo = 180): string {
    if (!texto) return '';
    if (texto.length <= maximo) return texto;
    const corte = texto.slice(0, maximo);
    // Retrocede hasta el último espacio para no dejar una palabra por la mitad.
    const ultimoEspacio = corte.lastIndexOf(' ');
    const base = ultimoEspacio > maximo * 0.6 ? corte.slice(0, ultimoEspacio) : corte;
    return base.replace(/[\s.,;:!?¡¿-]+$/, '') + '…';
  }
}
