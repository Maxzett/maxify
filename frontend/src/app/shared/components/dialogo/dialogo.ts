import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export type IconoDialogo = 'salir' | 'eliminar' | 'bloqueo' | 'sesion';

export interface DatosDialogo {
  titulo: string;
  mensaje: string;
  icono: IconoDialogo;
  textoConfirmar: string;
  // Sin textoCancelar el modal es solo informativo (un botón).
  textoCancelar?: string;
  // Botón de confirmar en rojo (acciones destructivas).
  peligro?: boolean;
}

// Modal reutilizable con el estilo de los bocetos (ícono + título + texto).
@Component({
  selector: 'app-dialogo',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './dialogo.html',
  styleUrl: './dialogo.scss',
})
export class Dialogo {
  datos = inject<DatosDialogo>(MAT_DIALOG_DATA);
}
