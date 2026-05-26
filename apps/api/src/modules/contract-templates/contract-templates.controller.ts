import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContractTemplatesService, CreateTemplateDto, FillTemplateDto } from './contract-templates.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Contract Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'contract-templates', version: '1' })
export class ContractTemplatesController {
  constructor(private readonly svc: ContractTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantillas disponibles (built-in + propias)' })
  @ApiQuery({ name: 'type', required: false, description: 'RESIDENTIAL | COMMERCIAL | SEASONAL' })
  list(@Query('type') type?: string) {
    return this.svc.list(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver una plantilla con su texto completo' })
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear plantilla personalizada' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTemplateDto) {
    return this.svc.create(user.id, body);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicar una plantilla (para poder editarla)' })
  duplicate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.duplicate(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar plantilla propia' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: Partial<CreateTemplateDto>,
  ) {
    return this.svc.update(id, user.id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla propia (soft delete)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(id, user.id);
  }

  @Post('fill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rellenar una plantilla con datos del contrato → devuelve texto final' })
  fill(@Body() body: FillTemplateDto) {
    return this.svc.fillTemplate(body).then(text => ({ content: text }));
  }
}
