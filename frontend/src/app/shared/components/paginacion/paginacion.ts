import { Component, computed, input, output } from '@angular/core';

// Un número de página o los puntos suspensivos que reemplazan a varias.
export type ItemPaginacion = number | 'puntos';

// Hasta esta cantidad de páginas se muestran todas; con más, se abrevia.
const MAX_SIN_ABREVIAR = 7;

// Paginación numerada reutilizable: « Anterior  1 … 4 5 6 … 12  Siguiente ».
// Recibe la página actual y el total con input() y avisa con output() qué
// página se eligió: el padre es quien la carga (igual que PublicacionCard).
@Component({
  selector: 'app-paginacion',
  templateUrl: './paginacion.html',
  styleUrl: './paginacion.scss',
})
export class Paginacion {
  pagina = input.required<number>();
  totalPaginas = input.required<number>();
  // Mientras se carga una página, los botones quedan deshabilitados.
  deshabilitada = input(false);

  cambiar = output<number>();

  esPrimera = computed(() => this.pagina() <= 1);
  esUltima = computed(() => this.pagina() >= this.totalPaginas());

  // Siempre se ven la primera, la última, la actual y sus vecinas. Los
  // huecos se reemplazan por "…", salvo que el hueco sea de una sola página:
  // en ese caso se muestra el número (no tiene sentido "…" en lugar de "2").
  items = computed<ItemPaginacion[]>(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    if (total <= MAX_SIN_ABREVIAR) return Array.from({ length: total }, (_, i) => i + 1);

    // Cerca de los extremos se muestran 4 seguidas para que la barra no cambie de ancho.
    let inicio = Math.max(2, actual - 1);
    let fin = Math.min(total - 1, actual + 1);
    if (actual <= 3) [inicio, fin] = [2, 4];
    if (actual >= total - 2) [inicio, fin] = [total - 3, total - 1];

    const items: ItemPaginacion[] = [1];
    if (inicio === 3) items.push(2);
    else if (inicio > 3) items.push('puntos');
    for (let n = inicio; n <= fin; n++) items.push(n);
    if (fin === total - 2) items.push(total - 1);
    else if (fin < total - 2) items.push('puntos');
    items.push(total);
    return items;
  });

  ir(pagina: number): void {
    if (this.deshabilitada() || pagina === this.pagina()) return;
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.cambiar.emit(pagina);
  }
}
