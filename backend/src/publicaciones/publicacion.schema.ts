import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { UsuarioMongo } from '../usuarios/usuario.schema';

@Schema({ collection: 'publicaciones', versionKey: false, timestamps: true })
export class PublicacionMongo {
  @Prop({ required: true, trim: true })
  titulo!: string;

  @Prop({ required: true, trim: true })
  mensaje!: string;

  @Prop({ default: '' })
  imagenUrl!: string;

  @Prop()
  imagenPublicId?: string;

  // Referencia al autor: populate() trae sus datos al listar.
  @Prop({ type: Types.ObjectId, ref: UsuarioMongo.name, required: true })
  autor!: Types.ObjectId;

  // Contador desnormalizado para ordenar por "me gusta" sin agregaciones.
  @Prop({ default: 0, min: 0 })
  likesCount!: number;

  // Baja lógica.
  @Prop({ default: false })
  eliminada!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PublicacionDocument = HydratedDocument<PublicacionMongo>;
export const PublicacionSchema = SchemaFactory.createForClass(PublicacionMongo);
