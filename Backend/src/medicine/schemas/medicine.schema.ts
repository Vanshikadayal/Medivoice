import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export enum MedicineFrequency {
  ONCE_DAILY = 'once_daily',
  TWICE_DAILY = 'twice_daily',
  THREE_TIMES_DAILY = 'three_times_daily',
  FOUR_TIMES_DAILY = 'four_times_daily',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class Medicine extends Document {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Prescription' })
  prescriptionId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  /**
   * Per-occasion dosage (e.g. "1 tablet").
   * Optional for prescription-created medicines when only strength/timing is known.
   * Empty string means the prescription did not state an explicit dosage.
   */
  @Prop({ required: false, default: '' })
  dosage!: string;

  @Prop({ required: true, enum: MedicineFrequency })
  frequency!: MedicineFrequency;

  @Prop({ required: true, type: Number, min: 1 })
  dosesPerDay!: number;

  /**
   * Course length in days. Optional when the prescription did not state duration.
   * null/undefined means unconfirmed — do NOT invent a clinical duration.
   */
  @Prop({ required: false, type: Number, min: 1, default: null })
  durationDays?: number | null;

  @Prop({ required: true, type: Date })
  startDate!: Date;

  @Prop()
  instructions?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
