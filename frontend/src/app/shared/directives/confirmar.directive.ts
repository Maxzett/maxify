import { Directive, HostListener, inject, input, output } from '@angular/core';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { DatosDialogo } from '../components/dialogo/dialogo';

// Directiva de atributo para acciones destructivas:
//   <button [appConfirmar]="datosDelModal" (confirmado)="eliminar()">
// Al hacer click abre el modal de confirmación y solo emite (confirmado) si
// el usuario acepta. Reemplaza al confirm() del navegador.
@Directive({ selector: '[appConfirmar]' })
export class Confirmar {
  private notificaciones = inject(NotificacionesService);

  datos = input.required<DatosDialogo>({ alias: 'appConfirmar' });
  confirmado = output<void>();

  @HostListener('click', ['$event'])
  alHacerClick(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.notificaciones.confirmar(this.datos()).subscribe((acepto) => {
      if (acepto) this.confirmado.emit();
    });
  }
}
