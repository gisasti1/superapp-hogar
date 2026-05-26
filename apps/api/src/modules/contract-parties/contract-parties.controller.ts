import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContractPartiesService, InviteCoSignerDto } from './contract-parties.service';

interface AuthUser { id: string; email: string; role: string; }

@ApiTags('Contract Parties — co-firmantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'contracts/:contractId/parties', version: '1' })
export class ContractPartiesController {
  constructor(private readonly svc: ContractPartiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar primary + co-firmantes de cada lado del contrato' })
  list(@CurrentUser() u: AuthUser, @Param('contractId') id: string) {
    return this.svc.listForContract(u.id, id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invitar a otra persona a co-firmar el contrato (del mismo lado que vos)' })
  invite(@CurrentUser() u: AuthUser, @Param('contractId') id: string, @Body() dto: InviteCoSignerDto) {
    return this.svc.invite(u.id, id, dto);
  }

  @Post('accept/:token')
  @ApiOperation({ summary: 'Aceptar la invitación con el token recibido' })
  accept(@CurrentUser() u: AuthUser, @Param('contractId') id: string, @Param('token') token: string) {
    return this.svc.accept(u.id, id, token);
  }

  @Post('decline/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar la invitación' })
  decline(@CurrentUser() u: AuthUser, @Param('contractId') id: string, @Param('token') token: string) {
    return this.svc.decline(u.id, id, token);
  }

  @Delete(':partyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar un co-firmante (sólo el primary del lado o el propio party)' })
  remove(@CurrentUser() u: AuthUser, @Param('contractId') id: string, @Param('partyId') partyId: string) {
    return this.svc.remove(u.id, id, partyId);
  }
}
