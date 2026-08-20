import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export enum ReminderShift {
  MORNING = 'MORNING',
  NOON = 'NOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT',
}

export enum ReminderStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
  MISSED = 'MISSED',
}

@Schema({ timestamps: true })
export class Reminder extends Document {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Medicine' })
  medicineId!: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Prescription' })
  prescriptionId!: Types.ObjectId;

  @Prop({ required: true, enum: ReminderShift })
  shift!: ReminderShift;

  @Prop({ required: true, type: Date })
  scheduledTime!: Date;

  @Prop({ required: true, type: Number })
  doseNumber!: number;

  @Prop({ required: true })
  dosage!: string;

  @Prop({ required: true, enum: ReminderStatus, default: ReminderStatus.PENDING })
  status!: ReminderStatus;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

ReminderSchema.index(
  { userId: 1, medicineId: 1, scheduledTime: 1 },
  { unique: true },
);
