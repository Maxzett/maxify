import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Versión básica de Mi perfil: muestra los datos del usuario logueado.
// Las últimas 3 publicaciones con sus comentarios se cargan en el Sprint 2.
@Component({
  selector: 'app-perfil',
  imports: [DatePipe, RouterLink, MatButtonModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil {
  auth = inject(AuthService);
}
