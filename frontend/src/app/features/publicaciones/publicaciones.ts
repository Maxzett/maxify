import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Orden, Publicacion } from '../../core/models/publicacion.interface';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { Paginacion } from '../../shared/components/paginacion/paginacion';
import { PublicacionCard } from '../../shared/components/publicacion-card/publicacion-card';

@Component({
  selector: 'app-publicaciones',
  imports: [PublicacionCard, Paginacion, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones {
  servicio = inject(PublicacionesService);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  // La página y el orden viven en la URL (?pagina=2&orden=likes): así se
  // conservan al recargar, al volver desde el detalle y con atrás/adelante
  // del navegador. Llegan como input() gracias a withComponentInputBinding.
  paginaUrl = input<string | undefined>(undefined, { alias: 'pagina' });
  ordenUrl = input<string | undefined>(undefined, { alias: 'orden' });

  // Un valor inválido en la URL (?pagina=abc, ?pagina=0) se toma como la página 1.
  private paginaPedida = computed(() => {
    const pagina = Number(this.paginaUrl());
    return Number.isInteger(pagina) && pagina >= 1 ? pagina : 1;
  });
  private ordenPedido = computed<Orden>(() => (this.ordenUrl() === 'likes' ? 'likes' : 'fecha'));

  // Publicaciones con un "me gusta" en curso (se deshabilita el botón).
  private procesando = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // Cada vez que cambia la URL se pide esa página al servidor.
    // untracked: cargar() lee signals del servicio que no deben volver a
    // disparar este effect.
    effect(() => {
      const pagina = this.paginaPedida();
      const orden = this.ordenPedido();
      untracked(() => this.servicio.cargar(pagina, orden));
    });

    // Página que ya no existe (?pagina=99, o se borró la única publicación
    // de la última página) → se va a la última, reemplazando la URL.
    effect(() => {
      if (this.servicio.cargando() || this.servicio.error()) return;
      const ultima = this.servicio.totalPaginas();
      if (this.servicio.pagina() > ultima) {
        untracked(() => this.navegar(ultima, this.servicio.orden(), true));
      }
    });
  }

  // El orden lo resuelve el servidor: al cambiarlo se vuelve a la página 1.
  cambiarOrden(orden: Orden): void {
    if (orden === this.servicio.orden()) return;
    this.navegar(1, orden);
  }

  irAPagina(pagina: number): void {
    this.navegar(pagina, this.servicio.orden());
    // La lista nueva empieza arriba: se sube para no quedar al final de la página.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Los valores por defecto (página 1, más recientes) no se escriben en la URL.
  private navegar(pagina: number, orden: Orden, reemplazar = false): void {
    this.router.navigate([], {
      queryParams: {
        pagina: pagina > 1 ? pagina : null,
        orden: orden === 'likes' ? orden : null,
      },
      replaceUrl: reemplazar,
    });
  }

  esPropia(publicacion: Publicacion): boolean {
    return publicacion.autor?.id === this.auth.usuario()?.id;
  }

  // El autor puede eliminar las suyas; un administrador, cualquiera.
  puedeEliminar(publicacion: Publicacion): boolean {
    return this.esPropia(publicacion) || this.auth.esAdmin();
  }

  estaProcesando(publicacion: Publicacion): boolean {
    return this.procesando().has(publicacion.id);
  }

  // Da o quita el "me gusta" según el estado actual.
  alternarMeGusta(publicacion: Publicacion): void {
    const id = publicacion.id;
    this.procesando.update((ids) => new Set(ids).add(id));
    const pedido = publicacion.meGusta
      ? this.servicio.quitarMeGusta(id)
      : this.servicio.darMeGusta(id);
    pedido.subscribe({
      next: () => this.terminar(id),
      error: (error: HttpErrorResponse) => {
        this.terminar(id);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  // La tarjeta ya confirmó con el modal (directiva appConfirmar).
  eliminar(publicacion: Publicacion): void {
    this.servicio.eliminar(publicacion.id).subscribe({
      next: () => {
        this.notificaciones.exito(
          this.esPropia(publicacion) ? 'Publicación eliminada.' : 'Publicación dada de baja.',
        );
        // Se vuelve a pedir la misma página para completarla con la
        // siguiente publicación (si era la última de su página, el
        // effect de "página que ya no existe" lleva a la anterior).
        this.servicio.cargar();
      },
      error: (error: HttpErrorResponse) =>
        this.notificaciones.error(this.notificaciones.mensajeDeError(error)),
    });
  }

  private terminar(id: string): void {
    this.procesando.update((ids) => {
      const copia = new Set(ids);
      copia.delete(id);
      return copia;
    });
  }
}
