import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AutorResumen, Publicacion } from '../../core/models/publicacion.interface';
import { AuthService } from '../../core/services/auth.service';
import { PublicacionesService } from '../../core/services/publicaciones.service';

// Cuántas publicaciones y cuántos comentarios por publicación se muestran.
const ULTIMAS_PUBLICACIONES = 3;
const COMENTARIOS_POR_PUBLICACION = 3;

// Mi perfil: datos del usuario logueado + sus últimas 3 publicaciones
// con sus comentarios.
@Component({
  selector: 'app-perfil',
  imports: [DatePipe, RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  auth = inject(AuthService);
  private publicacionesService = inject(PublicacionesService);

  publicaciones = signal<Publicacion[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  cargarPublicaciones(): void {
    const usuario = this.auth.usuario();
    if (!usuario) return;
    this.cargando.set(true);
    this.error.set(null);
    this.publicacionesService
      .listarDeUsuario(usuario.id, ULTIMAS_PUBLICACIONES, COMENTARIOS_POR_PUBLICACION)
      .subscribe({
        next: (pagina) => {
          this.publicaciones.set(pagina.publicaciones);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar tus publicaciones.');
          this.cargando.set(false);
        },
      });
  }

  iniciales(autor: AutorResumen | null): string {
    return autor ? (autor.nombre.charAt(0) + autor.apellido.charAt(0)).toUpperCase() : '?';
  }

  // Comentarios que no se muestran en la tarjeta (se verán en el detalle, Sprint 3).
  comentariosRestantes(publicacion: Publicacion): number {
    return publicacion.comentariosCount - (publicacion.comentarios?.length ?? 0);
  }
}
