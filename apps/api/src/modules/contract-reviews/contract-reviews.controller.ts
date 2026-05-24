import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContractReviewsService } from './contract-reviews.service';
import { CreateContractReviewDto } from './dto/create-review.dto';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Contract Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'contract-reviews', version: '1' })
export class ContractReviewsController {
  constructor(private readonly service: ContractReviewsService) {}

  @Post('contract/:contractId')
  @ApiOperation({ summary: 'Crear reseña sobre la contraparte del contrato' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('contractId') contractId: string,
    @Body() dto: CreateContractReviewDto,
  ) {
    return this.service.create(user.id, contractId, dto);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Listar reseñas de un contrato (ambas partes)' })
  listByContract(@CurrentUser() user: AuthUser, @Param('contractId') contractId: string) {
    return this.service.listByContract(user.id, user.role, contractId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Reseñas recibidas por un usuario + promedio' })
  listForUser(@Param('userId') userId: string) {
    return this.service.listForUser(userId);
  }
}
