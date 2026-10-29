import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Header } from './layout/header/header';

// Pantallas que se muestran sin navbar (tienen su propio logo).
const RUTAS_SIN_HEADER = ['/login', '/registro'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);

  // URL actual como signal: se actualiza en cada navegación.
  private url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  mostrarHeader = computed(
    () => !RUTAS_SIN_HEADER.some((ruta) => this.url().startsWith(ruta)),
  );
}
