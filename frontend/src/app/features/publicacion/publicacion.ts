import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Publicacion as PublicacionModelo } from '../../core/models/publicacion.interface';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';
import { PublicacionCard } from '../../shared/components/publicacion-card/publicacion-card';
import { Comentarios } from './comentarios/comentarios';

// Página Publicación: la publicación en grande y sus comentarios.
@Component({
  selector: 'app-publicacion',
  imports: [PublicacionCard, Comentarios, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.scss',
})
export class Publicacion {
  private servicio = inject(PublicacionesService);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);
  private router = inject(Router);

  // :id de la ruta (withComponentInputBinding).
  id = input.required<string>();

  publicacion = signal<PublicacionModelo | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  procesando = signal(false);

  esPropia = computed(() => {
    const publicacion = this.publicacion();
    return !!publicacion && publicacion.autor?.id === this.auth.usuario()?.id;
  });
  // El autor puede eliminarla; un administrador puede dar de baja cualquiera.
  puedeEliminar = computed(() => this.esPropia() || this.auth.esAdmin());

  constructor() {
    // Si cambia el id (otra publicación), se vuelve a cargar.
    effect(() => this.cargar(this.id()));
  }

  cargar(id: string = this.id()): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtener(id).subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          error.status === 404 || error.status === 400
            ? 'Esta publicación no existe o fue eliminada.'
            : this.notificaciones.mensajeDeError(error),
        );
      },
    });
  }

  alternarMeGusta(): void {
    const publicacion = this.publicacion();
    if (!publicacion) return;
    this.procesando.set(true);
    const pedido = publicacion.meGusta
      ? this.servicio.quitarMeGusta(publicacion.id)
      : this.servicio.darMeGusta(publicacion.id);
    pedido.subscribe({
      next: (estado) => {
        this.publicacion.update((p) => (p ? { ...p, ...estado } : p));
        this.procesando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  // La tarjeta ya confirmó con el modal (directiva appConfirmar).
  eliminar(): void {
    const publicacion = this.publicacion();
    if (!publicacion) return;
    this.servicio.eliminar(publicacion.id).subscribe({
      next: () => {
        this.notificaciones.exito(
          this.esPropia() ? 'Publicación eliminada.' : 'Publicación dada de baja.',
        );
        this.router.navigate(['/publicaciones']);
      },
      error: (error: HttpErrorResponse) =>
        this.notificaciones.error(this.notificaciones.mensajeDeError(error)),
    });
  }

  // El componente de comentarios avisa cuando se agrega uno.
  sumarComentario(): void {
    this.publicacion.update((p) => (p ? { ...p, comentariosCount: p.comentariosCount + 1 } : p));
  }
}
