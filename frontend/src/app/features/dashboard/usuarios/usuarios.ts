import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Usuario } from '../../../core/models/usuario.interface';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { DatosDialogo } from '../../../shared/components/dialogo/dialogo';
import { Confirmar } from '../../../shared/directives/confirmar.directive';
import { ImagenFallback } from '../../../shared/directives/imagen-fallback.directive';
import { NombreCompletoPipe } from '../../../shared/pipes/nombre-completo.pipe';

type Filtro = 'todos' | 'activos' | 'deshabilitados';

// Dashboard / Usuarios: listado de todos los usuarios con alta y baja lógica.
@Component({
  selector: 'app-dashboard-usuarios',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    Confirmar,
    ImagenFallback,
    NombreCompletoPipe,
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class DashboardUsuarios implements OnInit {
  private servicio = inject(UsuariosService);
  private auth = inject(AuthService);
  private notificaciones = inject(NotificacionesService);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  // Usuarios con un alta/baja en curso (se deshabilita su botón).
  procesando = signal<ReadonlySet<string>>(new Set());

  busqueda = signal('');
  filtro = signal<Filtro>('todos');

  // Filtro local por texto (nombre, usuario o correo) y por estado.
  visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.usuarios().filter((u) => {
      if (this.filtro() === 'activos' && !u.activo) return false;
      if (this.filtro() === 'deshabilitados' && u.activo) return false;
      if (!texto) return true;
      return [u.nombre, u.apellido, u.username, u.correo].some((campo) =>
        campo.toLowerCase().includes(texto),
      );
    });
  });
  totalActivos = computed(() => this.usuarios().filter((u) => u.activo).length);
  totalAdmins = computed(() => this.usuarios().filter((u) => u.perfil === 'administrador').length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  esYo(usuario: Usuario): boolean {
    return usuario.id === this.auth.usuario()?.id;
  }

  iniciales(usuario: Usuario): string {
    return (usuario.nombre.charAt(0) + usuario.apellido.charAt(0)).toUpperCase();
  }

  // Datos del modal de confirmación (directiva appConfirmar).
  confirmacion(usuario: Usuario): DatosDialogo {
    return usuario.activo
      ? {
          titulo: '¿Deshabilitar este usuario?',
          mensaje: `@${usuario.username} no va a poder ingresar a Maxify y, si tiene la sesión abierta, se le va a cerrar. Podés volver a habilitarlo cuando quieras.`,
          icono: 'bloqueo',
          textoCancelar: 'Cancelar',
          textoConfirmar: 'Deshabilitar',
          peligro: true,
        }
      : {
          titulo: '¿Habilitar este usuario?',
          mensaje: `@${usuario.username} va a poder volver a ingresar y usar Maxify.`,
          icono: 'sesion',
          textoCancelar: 'Cancelar',
          textoConfirmar: 'Habilitar',
        };
  }

  estaProcesando(usuario: Usuario): boolean {
    return this.procesando().has(usuario.id);
  }

  alternarActivo(usuario: Usuario): void {
    const id = usuario.id;
    this.procesando.update((ids) => new Set(ids).add(id));
    const pedido = usuario.activo ? this.servicio.deshabilitar(id) : this.servicio.habilitar(id);
    pedido.subscribe({
      next: (actualizado) => {
        this.terminar(id);
        this.usuarios.update((lista) => lista.map((u) => (u.id === id ? actualizado : u)));
        this.notificaciones.exito(
          actualizado.activo
            ? `Habilitaste a @${actualizado.username}.`
            : `Deshabilitaste a @${actualizado.username}.`,
        );
      },
      error: (error: HttpErrorResponse) => {
        this.terminar(id);
        this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
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
