import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsString, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RentAdjustmentsService } from './rent-adjustments.service';

interface AuthUser { id: string; email: string; role: string; }

const INDEX_TYPES = ['ICL', 'IPC', 'ICL_IPC_MIX', 'CUSTOM'] as const;
type IndexType = typeof INDEX_TYPES[number];

class ApplyAdjustmentDto {
  @IsEnum(INDEX_TYPES)
  index: IndexType;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  // Sólo se usa cuando index === 'CUSTOM'
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Type(() => Number)
  multiplier?: number;

  @IsString()
  @IsOptional()
  periodLabel?: string;
}

@ApiTags('Rent Adjustments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'rent-adjustments', version: '1' })
export class RentAdjustmentsController {
  constructor(private readonly service: RentAdjustmentsService) {}

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Histórico de ajustes de un contrato' })
  list(@CurrentUser() user: AuthUser, @Param('contractId') id: string) {
    return this.service.listForContract(user.id, user.role, id);
  }

  @Get('contract/:contractId/preview')
  @ApiOperation({ summary: 'Previsualizar cuánto subiría el alquiler con un índice (sin aplicar)' })
  preview(
    @CurrentUser() user: AuthUser,
    @Param('contractId') id: string,
    @Query('index') index: IndexType = 'ICL',
    @Query('fromDate') fromDate?: string,
  ) {
    return this.service.preview(user.id, user.role, id, index, fromDate);
  }

  @Post('contract/:contractId/apply')
  @ApiOperation({ summary: 'Aplicar ajuste y actualizar el monto del contrato (solo propietario)' })
  apply(
    @CurrentUser() user: AuthUser,
    @Param('contractId') id: string,
    @Body() dto: ApplyAdjustmentDto,
  ) {
    return this.service.apply(user.id, user.role, id, dto);
  }
}
