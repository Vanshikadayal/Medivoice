import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ChatMessageRole = 'user' | 'assistant';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'chat_messages' })
export class ChatMessage extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Conversation' })
  conversationId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role!: ChatMessageRole;

  @Prop({ required: true })
  content!: string;

  createdAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });
ChatMessageSchema.index({ userId: 1, createdAt: -1 });
