import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DatosDialogoSesion {
  // Momento exacto (ms) en el que vence el token.
  vence: number;
  // Con cuánta anticipación se abrió el aviso (para la barra de progreso).
  aviso: number;
}

// Modal "¿Extender sesión?" con cuenta regresiva en vivo. El tiempo se
// recalcula cada segundo desde el vencimiento del token (no se descuenta de a
// uno), así siempre coincide con la cookie aunque la pestaña haya estado en
// segundo plano. Devuelve true si el usuario quiere extender la sesión.
@Component({
  selector: 'app-dialogo-sesion',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './dialogo-sesion.html',
  styleUrls: ['../dialogo/dialogo.scss', './dialogo-sesion.scss'],
})
export class DialogoSesion {
  datos = inject<DatosDialogoSesion>(MAT_DIALOG_DATA);
  private ref = inject<MatDialogRef<DialogoSesion, boolean>>(MatDialogRef);

  private ahora = signal(Date.now());
  restanteMs = computed(() => Math.max(this.datos.vence - this.ahora(), 0));
  // "0:59", "1:00"…
  tiempo = computed(() => {
    const segundos = Math.ceil(this.restanteMs() / 1000);
    return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  });
  porcentaje = computed(() => Math.min((this.restanteMs() / this.datos.aviso) * 100, 100));
  porcentajeEntero = computed(() => Math.round(this.porcentaje()));

  constructor() {
    const intervalo = setInterval(() => {
      this.ahora.set(Date.now());
      if (this.restanteMs() === 0) this.ref.close(false);
    }, 250);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }
}
