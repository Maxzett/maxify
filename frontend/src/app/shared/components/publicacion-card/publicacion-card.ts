import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../core/models/publicacion.interface';
import { Confirmar } from '../../directives/confirmar.directive';
import { ImagenFallback } from '../../directives/imagen-fallback.directive';
import { NombreCompletoPipe } from '../../pipes/nombre-completo.pipe';
import { TiempoRelativoPipe } from '../../pipes/tiempo-relativo.pipe';
import { TruncarPipe } from '../../pipes/truncar.pipe';
import { DatosDialogo } from '../dialogo/dialogo';

// Cada publicación del feed es un componente: recibe los datos con input()
// y avisa al padre con output() cuando el usuario toca "me gusta" o confirma
// la baja (el modal lo abre la directiva appConfirmar). El padre (la página)
// es quien llama a la API.
@Component({
  selector: 'app-publicacion-card',
  imports: [
    DatePipe,
    RouterLink,
    Confirmar,
    ImagenFallback,
    NombreCompletoPipe,
    TiempoRelativoPipe,
    TruncarPipe,
  ],
  templateUrl: './publicacion-card.html',
  styleUrl: './publicacion-card.scss',
})
export class PublicacionCard {
  publicacion = input.required<Publicacion>();
  // Muestra el botón de eliminar: publicaciones propias o, para un
  // administrador, cualquier publicación.
  puedeEliminar = input(false);
  // true cuando un administrador da de baja la publicación de otra persona.
  bajaAdmin = input(false);
  // Deshabilita "me gusta" mientras se espera la respuesta del servidor.
  procesando = input(false);
  // En el feed el título y los comentarios llevan al detalle; en la página
  // Publicación (enlazar = false) la tarjeta se muestra grande, sin enlaces.
  enlazar = input(true);

  alternarMeGusta = output<void>();
  eliminar = output<void>();

  // Datos del modal de confirmación (directiva appConfirmar).
  confirmacion = computed<DatosDialogo>(() => {
    const { titulo, autor } = this.publicacion();
    return this.bajaAdmin()
      ? {
          titulo: '¿Dar de baja esta publicación?',
          mensaje: `Como administrador vas a dar de baja «${titulo}» de @${autor?.username ?? 'usuario eliminado'}. La publicación y sus comentarios dejarán de estar disponibles.`,
          icono: 'eliminar',
          textoCancelar: 'Cancelar',
          textoConfirmar: 'Dar de baja',
          peligro: true,
        }
      : {
          titulo: '¿Eliminar esta publicación?',
          mensaje: `«${titulo}» y sus comentarios dejarán de estar visibles.`,
          icono: 'eliminar',
          textoCancelar: 'Cancelar',
          textoConfirmar: 'Eliminar',
          peligro: true,
        };
  });

  iniciales = computed(() => {
    const autor = this.publicacion().autor;
    return autor ? (autor.nombre.charAt(0) + autor.apellido.charAt(0)).toUpperCase() : '?';
  });
}
