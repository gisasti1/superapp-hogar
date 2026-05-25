import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MercadoLibreService } from './mercadolibre.service';

class SearchExternalDto {
  @IsString() @IsOptional()
  q?: string;

  @IsString() @IsOptional()
  city?: string;

  @IsNumber() @IsOptional() @Min(0) @Type(() => Number)
  maxPrice?: number;

  @IsNumber() @IsOptional() @Min(1) @Max(50) @Type(() => Number)
  limit?: number;
}

@ApiTags('External Listings')
@Controller({ path: 'external-listings', version: '1' })
export class ExternalListingsController {
  constructor(private readonly meli: MercadoLibreService) {}

  @Get('mercadolibre/search')
  @ApiOperation({ summary: 'Buscar inmuebles en Mercado Libre Argentina (público)' })
  @ApiQuery({ name: 'q', required: false, example: 'palermo' })
  @ApiQuery({ name: 'city', required: false, example: 'Capital Federal' })
  @ApiQuery({ name: 'maxPrice', required: false, example: 500000 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  searchMeli(@Query() dto: SearchExternalDto) {
    return this.meli.search(dto);
  }
}
