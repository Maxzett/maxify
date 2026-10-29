import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';
import { DatosDialogo, Dialogo } from '../../shared/components/dialogo/dialogo';

// Reemplaza a alert(): toasts con MatSnackBar y modales con MatDialog.
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
  }

  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 6000,
      panelClass: 'toast-error',
    });
  }

  // Abre un modal y emite true solo si el usuario confirma.
  confirmar(datos: DatosDialogo): Observable<boolean> {
    return this.dialog
      .open(Dialogo, {
        data: datos,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(map((resultado) => resultado === true));
  }

  // Convierte un error HTTP en un mensaje legible.
  mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0)
      return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.';
    const mensaje = error.error?.message;
    if (Array.isArray(mensaje) && mensaje.length) return mensaje[0];
    if (typeof mensaje === 'string') return mensaje;
    return 'Ocurrió un error inesperado. Intentá de nuevo.';
  }
}
