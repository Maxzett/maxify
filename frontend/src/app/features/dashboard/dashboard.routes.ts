import { Routes } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Dashboard } from './dashboard';

// Rutas hijas de /dashboard (se cargan con loadChildren). Chart.js se
// registra en este nivel, así no se descarga en el resto de la app.
export const rutasDashboard: Routes = [
  {
    path: '',
    component: Dashboard,
    providers: [provideCharts(withDefaultRegisterables())],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      {
        path: 'usuarios',
        title: 'Usuarios · Panel · Maxify',
        loadComponent: () => import('./usuarios/usuarios').then((c) => c.DashboardUsuarios),
      },
      {
        path: 'usuarios/nuevo',
        title: 'Nuevo usuario · Panel · Maxify',
        loadComponent: () => import('./nuevo-usuario/nuevo-usuario').then((c) => c.NuevoUsuario),
      },
      {
        path: 'estadisticas',
        title: 'Estadísticas · Panel · Maxify',
        loadComponent: () => import('./estadisticas/estadisticas').then((c) => c.Estadisticas),
      },
    ],
  },
];
