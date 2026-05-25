import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';

interface AuthUser { id: string; email: string; role: string; }

class StartConversationDto {
  @IsString()
  otherUserId: string;

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsString()
  @IsOptional()
  rentalRequestId?: string;
}

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'conversations', version: '1' })
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Bandeja de entrada: mis conversaciones' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.listForUser(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Cantidad total de mensajes no leídos (para el badge)' })
  unread(@CurrentUser() user: AuthUser) {
    return this.service.unreadCount(user.id);
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar (o reabrir) conversación 1:1 con otro usuario' })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartConversationDto) {
    return this.service.getOrCreate(user.id, dto.otherUserId, {
      contractId: dto.contractId,
      rentalRequestId: dto.rentalRequestId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Header de la conversación (other + contexto)' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user.id, id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensajes (max 200). Pasar ?since=ISO para poll incremental' })
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('since') since?: string) {
    return this.service.listMessages(user.id, id, {
      since: since ? new Date(since) : undefined,
    });
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Enviar mensaje en la conversación' })
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(user.id, id, dto.content);
  }
}
