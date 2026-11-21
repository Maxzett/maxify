import { Directive, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

// Directiva estructural (mismo patrón que *appRole de clase):
//   <a *appSoloAdmin routerLink="/dashboard">Admin</a>
// Crea el elemento solo si el usuario logueado es administrador. Con effect()
// reacciona sola cuando cambia la sesión (login, logout).
@Directive({ selector: '[appSoloAdmin]' })
export class SoloAdmin {
  private template = inject(TemplateRef<unknown>);
  private contenedor = inject(ViewContainerRef);
  private auth = inject(AuthService);
  private visible = false;

  constructor() {
    effect(() => {
      const esAdmin = this.auth.esAdmin();
      if (esAdmin && !this.visible) {
        this.contenedor.createEmbeddedView(this.template);
      } else if (!esAdmin && this.visible) {
        this.contenedor.clear();
      }
      this.visible = esAdmin;
    });
  }
}
