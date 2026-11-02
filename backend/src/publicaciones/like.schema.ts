import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { UsuarioMongo } from '../usuarios/usuario.schema';
import { PublicacionMongo } from './publicacion.schema';

// Un "me gusta" es un documento propio (no un array dentro de la publicación):
// así el índice único de abajo garantiza uno solo por usuario y publicación.
// Solo createdAt: un "me gusta" no se edita.
@Schema({
  collection: 'likes',
  versionKey: false,
  timestamps: { createdAt: true, updatedAt: false },
})
export class LikeMongo {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UsuarioMongo.name,
    required: true,
  })
  usuario!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: PublicacionMongo.name,
    required: true,
  })
  publicacion!: Types.ObjectId;

  createdAt!: Date;
}

export type LikeDocument = HydratedDocument<LikeMongo>;
export const LikeSchema = SchemaFactory.createForClass(LikeMongo);

// Si el mismo usuario intenta repetir el "me gusta", Mongo rechaza el insert
// con el error 11000 y el servicio responde 409.
LikeSchema.index({ usuario: 1, publicacion: 1 }, { unique: true });
