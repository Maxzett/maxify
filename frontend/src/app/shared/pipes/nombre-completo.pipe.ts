import { Pipe, PipeTransform } from '@angular/core';

interface ConNombre {
  nombre: string;
  apellido: string;
}

// Usuario → nombre para mostrar.
//   {{ usuario | nombreCompleto }}              → "Lucía Méndez"
//   {{ usuario | nombreCompleto: 'apellido' }}  → "Méndez, Lucía" (listados)
// Si el autor ya no existe (null) muestra "Usuario eliminado".
@Pipe({ name: 'nombreCompleto' })
export class NombreCompletoPipe implements PipeTransform {
  transform(
    usuario: ConNombre | null | undefined,
    formato: 'nombre' | 'apellido' = 'nombre',
  ): string {
    if (!usuario) return 'Usuario eliminado';
    const nombre = usuario.nombre.trim();
    const apellido = usuario.apellido.trim();
    return formato === 'apellido' ? `${apellido}, ${nombre}` : `${nombre} ${apellido}`;
  }
}
