import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export const DEFAULT_CONVERSATION_TITLE = 'New Conversation';

@Schema({ timestamps: true, collection: 'chat_conversations' })
export class Conversation extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: DEFAULT_CONVERSATION_TITLE })
  title!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ userId: 1, updatedAt: -1 });
