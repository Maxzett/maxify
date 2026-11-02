import { AbstractControl, FormGroupDirective, NgForm, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

// Contraseña segura: al menos una mayúscula y un número.
// El mínimo de 8 caracteres se valida con Validators.minLength(8).
export const passwordSegura: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor: string = control.value ?? '';
  if (!valor) return null;
  const errores: ValidationErrors = {};
  if (!/[A-Z]/.test(valor)) errores['sinMayuscula'] = true;
  if (!/\d/.test(valor)) errores['sinNumero'] = true;
  return Object.keys(errores).length ? errores : null;
};

// Validador de grupo: "repetir contraseña" tiene que ser igual a "contraseña".
export const passwordsIguales: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  const password = grupo.get('password')?.value;
  const repetir = grupo.get('repetirPassword')?.value;
  return password && repetir && password !== repetir ? { passwordsDistintas: true } : null;
};

// Fecha (AAAA-MM-DD) que no sea futura y con una edad mínima.
export function edadMinima(anios: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor: string = control.value ?? '';
    if (!valor) return null;
    const fecha = new Date(`${valor}T00:00:00`);
    if (isNaN(fecha.getTime())) return { fechaInvalida: true };
    const hoy = new Date();
    if (fecha > hoy) return { fechaFutura: true };
    const limite = new Date(hoy.getFullYear() - anios, hoy.getMonth(), hoy.getDate());
    return fecha > limite ? { edadMinima: { requerida: anios } } : null;
  };
}

// Marca en rojo "repetir contraseña" también cuando el error está en el grupo.
export class RepetirPasswordMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const tocado = !!control && (control.touched || !!form?.submitted);
    return tocado && (!!control?.invalid || !!form?.hasError('passwordsDistintas'));
  }
}

// Imagen elegida en un input file (foto de perfil o de una publicación).
// Devuelve el mensaje de error o null si es válida. El servidor vuelve a
// validarla por su contenido; esto solo da un aviso inmediato.
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

export function errorDeImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'Elegí una imagen JPG, PNG o WebP.';
  if (archivo.size > MAX_IMAGEN_BYTES) return 'La imagen puede pesar hasta 5 MB.';
  return null;
}
