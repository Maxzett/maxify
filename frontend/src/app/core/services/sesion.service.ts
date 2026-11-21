import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Dialogo } from '../../shared/components/dialogo/dialogo';
import {
  DatosDialogoSesion,
  DialogoSesion,
} from '../../shared/components/dialogo-sesion/dialogo-sesion';
import { vencimientoDelToken } from '../utils/jwt';
import { AuthService } from './auth.service';
import { NotificacionesService } from './notificaciones.service';

// Cuánto antes del vencimiento del token aparece el aviso. La consigna pedía
// 5 de 15 minutos; para la corrección final el token dura 3 minutos y el
// aviso aparece cuando queda 1 minuto.
export const AVISO_ANTES_MS = 60 * 1000;

// Controla el tiempo de la sesión: programa el modal "¿extender sesión?" y,
// si nadie la extiende, cierra la sesión cuando el token vence.
@Injectable({ providedIn: 'root' })
export class SesionService {
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notificaciones = inject(NotificacionesService);

  private aviso?: ReturnType<typeof setTimeout>;
  private vencimiento?: ReturnType<typeof setTimeout>;
  private modal?: MatDialogRef<DialogoSesion, boolean>;

  constructor() {
    // Cada vez que cambia el token (login, registro, refrescar, cerrar sesión)
    // se reprograman los contadores. Los tiempos salen del claim "exp" del
    // propio token, así siguen siendo correctos aunque se recargue la página.
    effect(() => this.programar(this.auth.tokenActual()));
  }

  private programar(token: string | null): void {
    this.cancelar();
    if (!token) return;
    const vence = vencimientoDelToken(token);
    if (!vence) return;
    const restante = vence - Date.now();
    if (restante <= 0) {
      this.vencer();
      return;
    }
    // Ej.: token de 3 min → el aviso sale a los 2 min y el cierre a los 3.
    this.aviso = setTimeout(() => this.preguntar(vence), Math.max(restante - AVISO_ANTES_MS, 0));
    this.vencimiento = setTimeout(() => this.vencer(), restante);
  }

  private preguntar(vence: number): void {
    const datos: DatosDialogoSesion = { vence, aviso: AVISO_ANTES_MS };
    this.modal = this.dialog.open(DialogoSesion, {
      data: datos,
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      // Se responde con los botones: así no se descarta sin querer.
      disableClose: true,
    });
    this.modal.afterClosed().subscribe((extender) => {
      this.modal = undefined;
      if (extender === true) this.extender();
    });
  }

  private extender(): void {
    // Al guardar el token nuevo, el effect reprograma los contadores.
    this.auth.refrescar().subscribe({
      next: () => this.notificaciones.exito('Listo, extendimos tu sesión.'),
      error: (error: HttpErrorResponse) => {
        // 401 y cuenta deshabilitada ya los resuelve el interceptor.
        if (error.status !== 401 && error.status !== 403)
          this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  // El token venció sin extenderse: se borra la sesión (y la cookie), se
  // vuelve al login y se avisa con un modal.
  private vencer(): void {
    this.modal?.close();
    if (!this.auth.token) return;
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
    this.dialog.open(Dialogo, {
      data: {
        titulo: 'Tu sesión venció',
        mensaje:
          'Pasó el tiempo de tu sesión y no se extendió. Iniciá sesión de nuevo para seguir usando Maxify.',
        icono: 'sesion',
        textoConfirmar: 'Entendido',
      },
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    });
  }

  private cancelar(): void {
    clearTimeout(this.aviso);
    clearTimeout(this.vencimiento);
    this.modal?.close();
  }
}
