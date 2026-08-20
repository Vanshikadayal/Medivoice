import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: true, timestamps: true, collection: 'medicine_database' })
export class MedicineDatabaseEntry extends Document {
  @Prop({ required: true })
  externalId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  normalizedName!: string;

  @Prop({ type: Number, default: null })
  price!: number | null;

  @Prop({ type: Boolean, default: false })
  isDiscontinued!: boolean;

  @Prop({ type: String, default: null })
  manufacturerName!: string | null;

  @Prop({ type: String, default: null })
  type!: string | null;

  @Prop({ type: String, default: null })
  packSizeLabel!: string | null;

  @Prop({
    type: [{ raw: { type: String, required: true } }],
    default: [],
  })
  compositions!: Array<{ raw: string }>;

  @Prop({ type: [String], default: [] })
  substitutes!: string[];

  @Prop({ type: [String], default: [] })
  sideEffects!: string[];

  @Prop({ type: [String], default: [] })
  uses!: string[];

  @Prop({ type: String, default: null })
  chemicalClass!: string | null;

  @Prop({ type: String, default: null })
  habitForming!: string | null;

  @Prop({ type: String, default: null })
  therapeuticClass!: string | null;

  @Prop({ type: String, default: null })
  actionClass!: string | null;

  @Prop({ required: true, default: 'indian-medicine-dataset' })
  source!: string;
}

export const MedicineDatabaseSchema =
  SchemaFactory.createForClass(MedicineDatabaseEntry);

MedicineDatabaseSchema.index({ externalId: 1 }, { unique: true });
MedicineDatabaseSchema.index({ normalizedName: 1 });
MedicineDatabaseSchema.index({ manufacturerName: 1 });
