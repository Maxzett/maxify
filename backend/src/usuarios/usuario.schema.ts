import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export const PERFILES = ['usuario', 'administrador'] as const;
export type Perfil = (typeof PERFILES)[number];

// timestamps agrega createdAt y updatedAt automáticamente.
@Schema({ collection: 'usuarios', versionKey: false, timestamps: true })
export class UsuarioMongo {
  @Prop({ required: true, trim: true })
  nombre!: string;

  @Prop({ required: true, trim: true })
  apellido!: string;

  // unique crea un índice único en Mongo: dos usuarios no pueden repetir correo.
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username!: string;

  // select: false → el hash nunca viaja en las consultas, salvo que se pida.
  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true })
  fechaNacimiento!: Date;

  @Prop({ default: '', trim: true })
  descripcion!: string;

  @Prop({ default: '' })
  imagenUrl!: string;

  @Prop()
  imagenPublicId?: string;

  @Prop({ type: String, enum: PERFILES, default: 'usuario' })
  perfil!: Perfil;

  // Baja lógica (se usa desde el panel de administración).
  @Prop({ default: true })
  activo!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UsuarioDocument = HydratedDocument<UsuarioMongo>;
export const UsuarioSchema = SchemaFactory.createForClass(UsuarioMongo);
