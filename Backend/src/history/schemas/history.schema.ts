import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export enum HistoryStatus {
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
  MISSED = 'MISSED',
}

@Schema({ timestamps: true })
export class History extends Document {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Reminder' })
  reminderId!: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Medicine' })
  medicineId!: Types.ObjectId;

  @Prop({ required: true, enum: HistoryStatus })
  status!: HistoryStatus;

  @Prop({ required: true, type: Date })
  scheduledTime!: Date;

  @Prop({ required: true, type: Date })
  actionTime!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const HistorySchema = SchemaFactory.createForClass(History);
