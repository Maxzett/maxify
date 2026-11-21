import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sesion, TokenRefrescado, Usuario } from '../models/usuario.interface';
import { borrarCookie, guardarCookie, leerCookie } from '../utils/cookies';
import { vencimientoDelToken } from '../utils/jwt';

const COOKIE_TOKEN = 'maxify_token';
// Claves que usaban las versiones anteriores (token y usuario en localStorage).
const CLAVES_VIEJAS = ['maxify_token', 'maxify_usuario'];

// Servicio singleton: guarda el token en una cookie que vence junto con el
// JWT y expone el usuario y el token como signals de solo lectura (mismo
// patrón que en clase). Los datos del usuario no se guardan en el navegador:
// al recargar, la pantalla Cargando los vuelve a pedir con /auth/autorizar.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/auth`;

  // signals privados: solo el servicio puede cambiar la sesión.
  private usuarioSignal = signal<Usuario | null>(null);
  private tokenSignal = signal<string | null>(this.leerTokenGuardado());
  // true cuando el token ya se validó contra el servidor en esta carga de la
  // app (login, registro o /auth/autorizar en la pantalla Cargando).
  private validadaSignal = signal(false);

  // computed de solo lectura para los componentes.
  usuario = computed(() => this.usuarioSignal());
  tokenActual = computed(() => this.tokenSignal());
  validada = computed(() => this.validadaSignal());
  logueado = computed(() => this.usuarioSignal() !== null && this.tokenSignal() !== null);
  esAdmin = computed(() => this.usuarioSignal()?.perfil === 'administrador');
  iniciales = computed(() => {
    const usuario = this.usuarioSignal();
    if (!usuario) return '';
    return (usuario.nombre.charAt(0) + usuario.apellido.charAt(0)).toUpperCase();
  });

  // FormData porque el registro incluye la foto (multipart/form-data).
  registrar(datos: FormData): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${this.url}/registro`, datos)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  // identificador = correo o nombre de usuario.
  login(identificador: string, password: string): Observable<Sesion> {
    return this.http
      .post<Sesion>(`${this.url}/login`, { identificador, password })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  // Valida el token guardado (pantalla Cargando). Si es válido el servidor
  // devuelve los datos actualizados del usuario; si no, responde 401.
  autorizar(): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.url}/autorizar`, {}).pipe(
      tap((usuario) => {
        this.usuarioSignal.set(usuario);
        this.validadaSignal.set(true);
      }),
    );
  }

  // Pide un token nuevo (mismo payload, vencimiento renovado).
  refrescar(): Observable<TokenRefrescado> {
    return this.http
      .post<TokenRefrescado>(`${this.url}/refrescar`, {})
      .pipe(tap(({ token }) => this.guardarToken(token)));
  }

  // Después de editar el perfil: el header y Mi perfil se actualizan solos.
  actualizarUsuario(usuario: Usuario): void {
    this.usuarioSignal.set(usuario);
  }

  // Borra la cookie del token (deja de verse en DevTools → Application).
  cerrarSesion(): void {
    borrarCookie(COOKIE_TOKEN);
    this.usuarioSignal.set(null);
    this.tokenSignal.set(null);
    this.validadaSignal.set(false);
  }

  // El authInterceptor lo envía en el header Authorization.
  get token(): string | null {
    return this.tokenSignal();
  }

  private guardarSesion(sesion: Sesion): void {
    this.usuarioSignal.set(sesion.usuario);
    this.guardarToken(sesion.token);
    // El token lo acaba de emitir el servidor: no hace falta pasar por Cargando.
    this.validadaSignal.set(true);
  }

  // La cookie vence en el mismo instante que el JWT (claim "exp").
  private guardarToken(token: string): void {
    const vence = vencimientoDelToken(token);
    if (!vence) return;
    guardarCookie(COOKIE_TOKEN, token, new Date(vence));
    this.tokenSignal.set(token);
  }

  private leerTokenGuardado(): string | null {
    // Limpieza de versiones anteriores, que guardaban todo en localStorage.
    try {
      CLAVES_VIEJAS.forEach((clave) => localStorage.removeItem(clave));
    } catch {
      // Almacenamiento bloqueado: no hay nada que limpiar.
    }
    const token = leerCookie(COOKIE_TOKEN);
    const vence = token ? vencimientoDelToken(token) : null;
    // Por las dudas (reloj del sistema, cookie manipulada): vencido = sin sesión.
    if (!token || !vence || vence <= Date.now()) {
      borrarCookie(COOKIE_TOKEN);
      return null;
    }
    return token;
  }
}
