import { Routes } from '@angular/router';

// Todas las páginas se cargan con lazy loading (loadComponent).
// Todavía no hay guards de ruta (authGuard, adminGuard, guestGuard: Sprint 3).
// Mientras tanto la API exige token y, si responde 401, el authInterceptor
// cierra la sesión y lleva al login.
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
    path: 'crear-publicacion',
    title: 'Crear publicación · Maxify',
    loadComponent: () =>
      import('./features/crear-publicacion/crear-publicacion').then((c) => c.CrearPublicacion),
  },
  {
    path: 'perfil',
    title: 'Mi perfil · Maxify',
    loadComponent: () => import('./features/perfil/perfil').then((c) => c.Perfil),
  },
  // Cualquier ruta desconocida vuelve al feed.
  { path: '**', redirectTo: 'publicaciones' },
];
