import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DatosDialogo, Dialogo } from '../../shared/components/dialogo/dialogo';
import { vencimientoDelToken } from '../utils/jwt';
import { AuthService } from './auth.service';
import { NotificacionesService } from './notificaciones.service';

// El aviso aparece 5 minutos antes de que venza el token. Como el token dura
// 15 minutos, al iniciar sesión (o al extenderla) el contador es de 10 minutos.
const AVISO_ANTES_MS = 5 * 60 * 1000;

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
  private modal?: MatDialogRef<Dialogo, boolean>;

  constructor() {
    // Cada vez que cambia el token (login, registro, refrescar, cerrar sesión)
    // se reprograman los contadores. El vencimiento se lee del propio token,
    // así el contador sigue siendo correcto aunque se recargue la página.
    effect(() => this.programar(this.auth.tokenActual()));
  }

  private programar(token: string | null): void {
    this.cancelar();
    if (!token) return;
    const vence = vencimientoDelToken(token);
    if (!vence) return;
    const restante = vence - Date.now();
    // Ya vencido: el próximo pedido a la API responde 401 y el interceptor
    // lleva al login.
    if (restante <= 0) return;

    this.aviso = setTimeout(() => this.preguntar(vence),Math.max(restante - AVISO_ANTES_MS, 0));
    this.vencimiento = setTimeout(() => this.vencer(), restante);
  }

  private preguntar(vence: number): void {
    const minutos = Math.max(Math.round((vence - Date.now()) / 60000), 1);
    const datos: DatosDialogo = {
      titulo: '¿Querés extender tu sesión?',
      mensaje: `Tu sesión vence en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}. Si la extendés, vas a poder seguir usando Maxify sin volver a ingresar.`,
      icono: 'sesion',
      textoCancelar: 'No, gracias',
      textoConfirmar: 'Extender sesión',
    };
    this.modal = this.dialog.open(Dialogo, {
      data: datos,
      width: '400px',
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
      next: () => this.notificaciones.exito('Listo, extendimos tu sesión 15 minutos.'),
      error: (error: HttpErrorResponse) => {
        // Un 401 ya lo resuelve el interceptor (cierra sesión y va al login).
        if (error.status !== 401)
          this.notificaciones.error(this.notificaciones.mensajeDeError(error));
      },
    });
  }

  // El token venció sin extenderse: se cierra la sesión y se vuelve al login.
  private vencer(): void {
    this.modal?.close();
    if (!this.auth.token) return;
    this.auth.cerrarSesion();
    this.notificaciones.error('Tu sesión venció. Iniciá sesión de nuevo.');
    this.router.navigate(['/login']);
  }

  private cancelar(): void {
    clearTimeout(this.aviso);
    clearTimeout(this.vencimiento);
    this.modal?.close();
  }
}
