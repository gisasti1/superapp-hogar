import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IssuesService } from './issues.service';
import { CreateIssueDto, UpdateIssueStatusDto } from './dto/create-issue.dto';

interface AuthUser { id: string; email: string; role: string; }

const ISSUES_UPLOADS_DIR =
  process.env.ISSUES_UPLOADS_DIR ??
  (process.env.NODE_ENV === 'production'
    ? '/tmp/superapp-uploads/issues'
    : join(process.cwd(), '..', '..', '.local-uploads', 'issues'));

try { mkdirSync(ISSUES_UPLOADS_DIR, { recursive: true }); } catch { /* no-op */ }

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'issues', version: '1' })
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar issues visibles para el usuario' })
  list(@CurrentUser() user: AuthUser) {
    return this.issuesService.listForUser(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un issue' })
  getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.issuesService.getById(user.id, user.role, id);
  }

  @Post('property/:propertyId')
  @ApiOperation({ summary: 'Reportar nuevo issue en una propiedad' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issuesService.create(user.id, propertyId, dto);
  }

  @Post('upload-photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir fotos para attachear a un issue (max 5, 5MB c/u)' })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: ISSUES_UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Sólo JPG, PNG o WEBP'), ok);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhotos(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Subí al menos una foto');
    return { urls: files.map(f => `/uploads/issues/${f.filename}`) };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar estado del issue (propietario/admin/reporter limitado)' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateIssueStatusDto,
  ) {
    return this.issuesService.updateStatus(user.id, user.role, id, dto);
  }
}
