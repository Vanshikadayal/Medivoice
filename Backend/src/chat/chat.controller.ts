import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  createConversation(@CurrentUser() userId: string) {
    return this.chatService.createConversation(userId);
  }

  @Get('conversations')
  getConversations(@CurrentUser() userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:conversationId')
  getConversationHistory(
    @CurrentUser() userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversationHistory(userId, conversationId);
  }

  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  deleteConversation(
    @CurrentUser() userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.deleteConversation(userId, conversationId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  sendMessage(
    @CurrentUser() userId: string,
    @Body() chatMessageDto: ChatMessageDto,
  ) {
    return this.chatService.sendMessage(
      userId,
      chatMessageDto.conversationId,
      chatMessageDto.message,
    );
  }
}
