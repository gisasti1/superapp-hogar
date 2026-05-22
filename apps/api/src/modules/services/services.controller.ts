import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ServicesService } from './services.service';
import { RequestQuoteDto } from './dto/request-quote.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Buscar proveedores verificados' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async searchProviders(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
  ) {
    return this.servicesService.searchProviders(category, city, page ? parseInt(page, 10) : 1);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Ver perfil de proveedor' })
  async getProvider(@Param('id') id: string) {
    return this.servicesService.getProvider(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Solicitar presupuesto a un proveedor' })
  async requestQuote(@CurrentUser() user: AuthUser, @Body() dto: RequestQuoteDto) {
    return this.servicesService.requestQuote(user.id, dto);
  }

  @Post('bookings/:id/quote')
  @ApiOperation({ summary: 'Proveedor responde con presupuesto' })
  @HttpCode(HttpStatus.OK)
  async submitQuote(
    @CurrentUser() user: AuthUser,
    @Param('id') bookingId: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.servicesService.submitQuote(user.id, bookingId, dto.amount);
  }

  @Post('bookings/:id/accept')
  @ApiOperation({ summary: 'Cliente acepta presupuesto' })
  @HttpCode(HttpStatus.OK)
  async acceptQuote(@CurrentUser() user: AuthUser, @Param('id') bookingId: string) {
    return this.servicesService.acceptQuote(user.id, bookingId);
  }

  @Post('bookings/:id/complete')
  @ApiOperation({ summary: 'Proveedor marca servicio como completado' })
  @HttpCode(HttpStatus.OK)
  async complete(@CurrentUser() user: AuthUser, @Param('id') bookingId: string) {
    return this.servicesService.completeBooking(user.id, bookingId);
  }

  @Post('bookings/:id/review')
  @ApiOperation({ summary: 'Cliente deja reseña del servicio' })
  async submitReview(
    @CurrentUser() user: AuthUser,
    @Param('id') bookingId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.servicesService.submitReview(user.id, bookingId, dto.rating, dto.comment);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Listar mis reservas' })
  async getMyBookings(@CurrentUser() user: AuthUser) {
    return this.servicesService.getMyBookings(user.id);
  }
}
