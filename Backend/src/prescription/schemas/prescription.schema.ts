import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import {
  PrescriptionExtractionSnapshot,
  PrescriptionStatus,
} from '../types/prescription-status';

@Schema({ timestamps: true })
export class Prescription extends Document {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  imageUrl!: string;

  @Prop()
  extractedText?: string;

  @Prop()
  doctorName?: string;

  @Prop()
  patientName?: string;

  @Prop({ type: Date })
  prescriptionDate?: Date;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(PrescriptionStatus),
    default: PrescriptionStatus.UPLOADED,
  })
  status!: PrescriptionStatus;

  /** Cached extraction for review — medicines not yet confirmed. */
  @Prop({ type: SchemaTypes.Mixed })
  extractionResult?: PrescriptionExtractionSnapshot | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
