import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Search — búsqueda global')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda global por palabras clave (inmuebles, servicios, mis contratos, etc.)' })
  @ApiQuery({ name: 'q', required: true, description: 'Mínimo 2 caracteres' })
  search(@CurrentUser() u: AuthUser, @Query('q') q: string) {
    return this.svc.search(u.id, q ?? '');
  }
}
