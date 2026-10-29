import { Routes } from '@angular/router';

// Todas las páginas se cargan con lazy loading (loadComponent).
// En el Sprint 1 todavía no hay restricciones de acceso: los guards
// (authGuard, adminGuard, guestGuard) se agregan en el Sprint 3.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Iniciar sesión · Maxify',
    loadComponent: () =>
      import('./features/auth/login/login').then((c) => c.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Maxify',
    loadComponent: () =>
      import('./features/auth/registro/registro').then((c) => c.Registro),
  },
  {
    path: 'publicaciones',
    title: 'Publicaciones · Maxify',
    loadComponent: () =>
      import('./features/publicaciones/publicaciones').then(
        (c) => c.Publicaciones,
      ),
  },
  {
    path: 'perfil',
    title: 'Mi perfil · Maxify',
    loadComponent: () => import('./features/perfil/perfil').then((c) => c.Perfil),
  },
  // Cualquier ruta desconocida vuelve al feed.
  { path: '**', redirectTo: 'publicaciones' },
];
