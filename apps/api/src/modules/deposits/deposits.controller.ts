import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DepositsService } from './deposits.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'deposits', version: '1' })
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  @ApiOperation({ summary: 'Depositar garantía y crear preferencia de pago' })
  async deposit(@CurrentUser() user: AuthUser, @Body() dto: CreateDepositDto) {
    return this.depositsService.deposit(user.id, dto.contractId, dto.amount);
  }

  @Get(':contractId')
  @ApiOperation({ summary: 'Obtener balance del depósito de garantía' })
  async getBalance(@CurrentUser() user: AuthUser, @Param('contractId') contractId: string) {
    return this.depositsService.getBalance(user.id, contractId);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Solicitar liberación del depósito' })
  @HttpCode(HttpStatus.OK)
  async release(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.depositsService.releaseDeposit(id, user.id);
  }
}
