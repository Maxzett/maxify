import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

// Todas las páginas se cargan con lazy loading (loadComponent).
// - authGuard: solo con sesión (si el token no se validó todavía, pasa por Cargando).
// - guestGuard: login y registro solo sin sesión.
export const routes: Routes = [
  // Al abrir la app se valida el token guardado.
  { path: '', redirectTo: 'cargando', pathMatch: 'full' },
  {
    path: 'cargando',
    title: 'Cargando · Maxify',
    loadComponent: () => import('./features/cargando/cargando').then((c) => c.Cargando),
  },
  {
    path: 'login',
    title: 'Iniciar sesión · Maxify',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((c) => c.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Maxify',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/registro/registro').then((c) => c.Registro),
  },
  {
    path: 'publicaciones',
    title: 'Publicaciones · Maxify',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/publicaciones/publicaciones').then((c) => c.Publicaciones),
  },
  {
    path: 'publicacion/:id',
    title: 'Publicación · Maxify',
    canActivate: [authGuard],
    loadComponent: () => import('./features/publicacion/publicacion').then((c) => c.Publicacion),
  },
  {
    path: 'crear-publicacion',
    title: 'Crear publicación · Maxify',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/crear-publicacion/crear-publicacion').then((c) => c.CrearPublicacion),
  },
  {
    path: 'perfil',
    title: 'Mi perfil · Maxify',
    canActivate: [authGuard],
    loadComponent: () => import('./features/perfil/perfil').then((c) => c.Perfil),
  },
  {
    path: 'perfil/editar',
    title: 'Editar perfil · Maxify',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/editar-perfil/editar-perfil').then((c) => c.EditarPerfil),
  },
  // Panel de administración: authGuard (sesión validada) + adminGuard (perfil).
  // Sus rutas (y Chart.js) se descargan solo cuando entra un administrador.
  {
    path: 'dashboard',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((r) => r.rutasDashboard),
  },
  // Cualquier ruta desconocida vuelve al feed.
  { path: '**', redirectTo: 'publicaciones' },
];
