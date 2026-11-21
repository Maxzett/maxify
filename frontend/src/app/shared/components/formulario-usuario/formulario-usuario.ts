import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { RouterLink } from '@angular/router';
import { Usuario } from '../../../core/models/usuario.interface';
import { TIPOS_ACEPTADOS, prepararImagen } from '../../../core/utils/imagen';
import {
  RepetirPasswordMatcher,
  edadMinima,
  errorDeImagen,
  passwordSegura,
  passwordsIguales,
} from '../../../core/validators/validadores';

export const MAX_DESCRIPCION = 200;

// registro → cuenta propia (perfil "usuario").
// admin    → alta desde el panel, con radio buttons usuario / administrador.
// editar   → Mi perfil: sin contraseña; correo y usuario se muestran pero no
//            se editan (viajan dentro del token).
export type ModoFormularioUsuario = 'registro' | 'admin' | 'editar';

// Formulario de datos de usuario, compartido por Registro, Nuevo usuario
// (dashboard) y Editar perfil. Valida, arma el FormData (multipart, con la
// foto) y se lo pasa al padre con output(); el padre llama a la API.
@Component({
  selector: 'app-formulario-usuario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatRadioModule,
  ],
  templateUrl: './formulario-usuario.html',
  styleUrl: './formulario-usuario.scss',
})
export class FormularioUsuario {
  private fb = inject(FormBuilder);

  modo = input<ModoFormularioUsuario>('registro');
  // Datos actuales (solo en modo editar).
  usuario = input<Usuario | null>(null);
  cargando = input(false);
  textoEnviar = input('Guardar');
  rutaCancelar = input('/');

  enviar = output<FormData>();
  // Se intentó enviar con errores (el padre muestra el aviso).
  invalido = output<void>();

  readonly maxDescripcion = MAX_DESCRIPCION;
  readonly tiposFoto = TIPOS_ACEPTADOS;
  readonly repetirMatcher = new RepetirPasswordMatcher();
  readonly hoy = new Date().toISOString().slice(0, 10);

  editando = computed(() => this.modo() === 'editar');

  form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._]{3,20}$/)]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(64), passwordSegura],
      ],
      repetirPassword: ['', Validators.required],
      fechaNacimiento: ['', [Validators.required, edadMinima(13)]],
      descripcion: ['', Validators.maxLength(MAX_DESCRIPCION)],
      perfil: ['usuario' as 'usuario' | 'administrador'],
    },
    { validators: passwordsIguales },
  );

  // La foto no forma parte del FormGroup: es un File que se agrega al FormData.
  foto = signal<File | null>(null);
  vistaPrevia = signal<string | null>(null);
  errorFoto = signal<string | null>(null);
  // true mientras se convierte una foto HEIC del iPhone a JPG.
  procesandoFoto = signal(false);

  // Foto que se muestra: la nueva elegida o, al editar, la actual.
  fotoMostrada = computed(() => this.vistaPrevia() ?? (this.usuario()?.imagenUrl || null));

  constructor() {
    // Libera la URL temporal de la vista previa al salir de la pantalla.
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());

    // Modo editar: se precargan los datos y se deshabilitan los campos que no
    // se pueden cambiar (los controles deshabilitados no se validan).
    effect(() => {
      if (!this.editando()) return;
      const { password, repetirPassword, correo, username } = this.form.controls;
      [password, repetirPassword, correo, username].forEach((control) => control.disable());
      const usuario = this.usuario();
      if (usuario && this.form.pristine) {
        this.form.patchValue({
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          correo: usuario.correo,
          username: usuario.username,
          fechaNacimiento: usuario.fechaNacimiento,
          descripcion: usuario.descripcion,
        });
      }
    });
  }

  async elegirFoto(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const elegido = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!elegido) return;

    // Las fotos HEIC se convierten a JPG antes de validarlas y subirlas.
    this.procesandoFoto.set(true);
    this.errorFoto.set(null);
    let archivo: File;
    try {
      archivo = await prepararImagen(elegido);
    } catch (error) {
      this.errorFoto.set((error as Error).message);
      return;
    } finally {
      this.procesandoFoto.set(false);
    }

    const error = errorDeImagen(archivo);
    this.errorFoto.set(error);
    if (error) return;
    this.liberarVistaPrevia();
    this.foto.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
    this.form.markAsDirty();
  }

  quitarFoto(): void {
    this.liberarVistaPrevia();
    this.foto.set(null);
  }

  enviarFormulario(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.invalido.emit();
      return;
    }
    if (this.procesandoFoto()) return;

    // multipart/form-data: los campos de texto que correspondan + "foto".
    const valores = this.form.getRawValue();
    const campos: (keyof typeof valores)[] = this.editando()
      ? ['nombre', 'apellido', 'fechaNacimiento', 'descripcion']
      : [
          'nombre',
          'apellido',
          'correo',
          'username',
          'password',
          'repetirPassword',
          'fechaNacimiento',
          'descripcion',
        ];
    if (this.modo() === 'admin') campos.push('perfil');

    const datos = new FormData();
    for (const campo of campos) datos.append(campo, valores[campo].trim());
    const foto = this.foto();
    if (foto) datos.append('foto', foto);
    this.enviar.emit(datos);
  }

  // 409: el servidor indica qué campo está repetido y lo marcamos en rojo.
  marcarEnUso(campo: 'correo' | 'username', mensaje: string): void {
    const control = this.form.controls[campo];
    control.setErrors({ enUso: mensaje });
    control.markAsTouched();
  }

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) URL.revokeObjectURL(url);
    this.vistaPrevia.set(null);
  }
}
