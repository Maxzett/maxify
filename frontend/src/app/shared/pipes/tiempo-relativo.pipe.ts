import { Pipe, PipeTransform } from '@angular/core';

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

// Fecha → texto relativo: "recién", "hace 5 min", "hace 3 h", "hace 2 días".
// Pasada una semana muestra la fecha corta ("14 nov"), y con otro año también
// el año ("14 nov 2025"). Pipe puro: se recalcula cuando cambia la fecha.
@Pipe({ name: 'tiempoRelativo' })
export class TiempoRelativoPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined, ahora: number = Date.now()): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '';
    const segundos = Math.max(Math.floor((ahora - fecha.getTime()) / 1000), 0);

    if (segundos < MINUTO) return 'recién';
    if (segundos < HORA) return `hace ${Math.floor(segundos / MINUTO)} min`;
    if (segundos < DIA) return `hace ${Math.floor(segundos / HORA)} h`;
    const dias = Math.floor(segundos / DIA);
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;

    const mismoAnio = fecha.getFullYear() === new Date(ahora).getFullYear();
    return fecha
      .toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        ...(mismoAnio ? {} : { year: 'numeric' }),
      })
      .replace('.', '');
  }
}
