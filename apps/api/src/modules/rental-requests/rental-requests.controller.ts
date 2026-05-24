import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RentalRequestsService } from './rental-requests.service';
import { CreateRentalRequestDto, RespondRentalRequestDto } from './dto/create-rental-request.dto';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Rental Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'rental-requests', version: '1' })
export class RentalRequestsController {
  constructor(private readonly service: RentalRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis solicitudes (enviadas o recibidas)' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de una solicitud' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(user.id, user.role, id);
  }

  @Post('property/:propertyId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inquilino postula a una propiedad publicada' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateRentalRequestDto,
  ) {
    return this.service.create(user.id, propertyId, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propietario aprueba la solicitud' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondRentalRequestDto) {
    return this.service.approve(user.id, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propietario rechaza la solicitud' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondRentalRequestDto) {
    return this.service.reject(user.id, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inquilino cancela su propia solicitud (sólo si PENDING)' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user.id, id);
  }
}
