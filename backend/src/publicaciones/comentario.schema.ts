import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { UsuarioMongo } from '../usuarios/usuario.schema';
import { PublicacionMongo } from './publicacion.schema';

// Comentarios en colección propia: se paginan por publicación y se pueden
// contar por rango de fechas. La fecha del comentario es createdAt.
@Schema({ collection: 'comentarios', versionKey: false, timestamps: true })
export class ComentarioMongo {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: PublicacionMongo.name,
    required: true,
  })
  publicacion!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UsuarioMongo.name,
    required: true,
  })
  autor!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  mensaje!: string;

  // true cuando el autor lo editó (se muestra "(editado)").
  @Prop({ default: false })
  modificado!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ComentarioDocument = HydratedDocument<ComentarioMongo>;
export const ComentarioSchema = SchemaFactory.createForClass(ComentarioMongo);

// Los comentarios siempre se piden por publicación y del más nuevo al más viejo.
ComentarioSchema.index({ publicacion: 1, createdAt: -1 });
