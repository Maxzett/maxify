import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Orden, Publicacion } from '../../core/models/publicacion.interface';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { PublicacionCard } from '../../shared/components/publicacion-card/publicacion-card';

@Component({
  selector: 'app-publicaciones',
  imports: [PublicacionCard, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class Publicaciones implements OnInit {
  servicio = inject(PublicacionesService);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);

  // Publicaciones con un "me gusta" en curso (se deshabilita el botón).
  private procesando = signal<ReadonlySet<string>>(new Set());

  // El botón flotante "volver arriba" aparece desde la segunda carga.
  mostrarVolverArriba = computed(() => this.servicio.paginasCargadas() > 1);

  ngOnInit(): void {
    this.servicio.cargar();
  }

  // El orden lo resuelve el servidor: al cambiarlo se pide la primera página.
  cambiarOrden(orden: Orden): void {
    if (orden === this.servicio.orden()) return;
    this.servicio.cargar(orden);
  }

  verMas(): void {
    this.servicio.verMas().subscribe({
      error: (error: HttpErrorResponse) =>
        this.notificaciones.error(this.notificaciones.mensajeDeError(error)),
    });
  }

  volverArriba(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  esPropia(publicacion: Publicacion): boolean {
    return publicacion.autor?.id === this.auth.usuario()?.id;
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

  // Modal de confirmación (sin alert) y recién después la baja.
  eliminar(publicacion: Publicacion): void {
    this.notificaciones
      .confirmar({
        titulo: '¿Eliminar esta publicación?',
        mensaje: `«${publicacion.titulo}» y sus comentarios dejarán de estar visibles.`,
        icono: 'eliminar',
        textoCancelar: 'Cancelar',
        textoConfirmar: 'Eliminar',
        peligro: true,
      })
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.servicio.eliminar(publicacion.id).subscribe({
          next: () => this.notificaciones.exito('Publicación eliminada.'),
          error: (error: HttpErrorResponse) =>
            this.notificaciones.error(this.notificaciones.mensajeDeError(error)),
        });
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
