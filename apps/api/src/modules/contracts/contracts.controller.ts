import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'contracts', version: '1' })
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo contrato (DRAFT)' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis contratos (como inquilino o propietario)' })
  async list(@CurrentUser() user: AuthUser) {
    return this.contractsService.listByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contrato por ID' })
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractsService.getById(id, user.id);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Firmar un contrato' })
  async sign(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contractsService.sign(id, user.id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del contrato' })
  async getPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.contractsService.getContractPdf(id, user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contrato-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
