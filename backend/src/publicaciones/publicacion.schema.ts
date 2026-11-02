import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
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
  // Schema.Types.ObjectId (no Types.ObjectId) para que Mongoose lo guarde
  // como ObjectId y no como un valor "Mixed" sin conversión.
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UsuarioMongo.name,
    required: true,
  })
  autor!: Types.ObjectId;

  // Contador desnormalizado para ordenar por "me gusta" sin agregaciones.
  @Prop({ default: 0, min: 0 })
  likesCount!: number;

  // Mismo criterio para los comentarios (se incrementa al comentar, Sprint 3).
  @Prop({ default: 0, min: 0 })
  comentariosCount!: number;

  // Baja lógica.
  @Prop({ default: false })
  eliminada!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PublicacionDocument = HydratedDocument<PublicacionMongo>;
export const PublicacionSchema = SchemaFactory.createForClass(PublicacionMongo);

// Índices para los dos órdenes del listado y para el filtro por autor.
PublicacionSchema.index({ eliminada: 1, createdAt: -1 });
PublicacionSchema.index({ eliminada: 1, likesCount: -1, createdAt: -1 });
PublicacionSchema.index({ autor: 1, eliminada: 1, createdAt: -1 });
