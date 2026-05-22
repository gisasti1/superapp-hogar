import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediationService } from './mediation.service';
import { OpenCaseDto } from './dto/open-case.dto';
import { StatementDto } from './dto/statement.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('Mediation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'mediation', version: '1' })
export class MediationController {
  constructor(private readonly mediationService: MediationService) {}

  @Post('cases')
  @ApiOperation({ summary: 'Abrir un caso de mediación' })
  async openCase(@CurrentUser() user: AuthUser, @Body() dto: OpenCaseDto) {
    return this.mediationService.openCase(user.id, dto);
  }

  @Get('cases')
  @ApiOperation({ summary: 'Listar mis casos de mediación' })
  async listCases(@CurrentUser() user: AuthUser) {
    return this.mediationService.listCases(user.id);
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Obtener detalle de un caso' })
  async getCase(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediationService.getCase(id, user.id);
  }

  @Post('cases/:id/statement')
  @ApiOperation({ summary: 'Enviar declaración al caso' })
  async submitStatement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: StatementDto,
  ) {
    return this.mediationService.submitStatement(id, user.id, dto.content);
  }

  @Post('cases/:id/evidence')
  @ApiOperation({ summary: 'Subir evidencia al caso' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadEvidence(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.mediationService.uploadEvidence(id, user.id, files);
  }

  @Post('cases/:id/accept')
  @ApiOperation({ summary: 'Aceptar propuesta de mediación' })
  @HttpCode(HttpStatus.OK)
  async acceptProposal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediationService.acceptProposal(id, user.id);
  }

  @Post('cases/:id/escalate')
  @ApiOperation({ summary: 'Escalar caso a mediación humana' })
  @HttpCode(HttpStatus.OK)
  async escalate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.mediationService.escalate(id, user.id);
  }
}
