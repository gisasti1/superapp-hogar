import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaudeService } from '../../common/services/claude.service';
import { S3Service } from '../../common/services/s3.service';
import { OpenCaseDto } from './dto/open-case.dto';

interface MulterFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class MediationService {
  private readonly logger = new Logger(MediationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeService,
    private readonly s3: S3Service,
  ) {}

  async openCase(userId: string, dto: OpenCaseDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: dto.contractId },
    });
    if (!contract) throw new NotFoundException('Contrato no encontrado.');

    if (contract.tenantId !== userId && contract.landlordId !== userId) {
      throw new ForbiddenException('Solo las partes del contrato pueden abrir un caso de mediación.');
    }

    const mediationCase = await this.prisma.mediationCase.create({
      data: {
        contractId: dto.contractId,
        openedById: userId,
        category: dto.category,
        summary: dto.summary,
        status: 'OPENED',
      },
      include: {
        contract: { select: { tenantId: true, landlordId: true } },
        openedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    this.logger.log(`Mediation case opened: ${mediationCase.id}`);
    return mediationCase;
  }

  async submitStatement(caseId: string, userId: string, content: string) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: { contract: true, statements: true },
    });

    if (!mediationCase) throw new NotFoundException('Caso no encontrado.');

    const { tenantId, landlordId } = mediationCase.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Solo las partes del contrato pueden declarar en este caso.');
    }

    if (['RESOLVED', 'CLOSED', 'ESCALATED'].includes(mediationCase.status)) {
      throw new BadRequestException('El caso ya no está activo.');
    }

    const alreadyStated = mediationCase.statements.find((s) => s.userId === userId);
    if (alreadyStated) {
      throw new BadRequestException('Ya enviaste tu declaración para este caso.');
    }

    const statement = await this.prisma.caseStatement.create({
      data: { caseId, userId, content },
    });

    // Check if both parties have now submitted statements
    const allStatements = await this.prisma.caseStatement.findMany({
      where: { caseId },
    });

    const tenantStated = allStatements.some((s) => s.userId === tenantId);
    const landlordStated = allStatements.some((s) => s.userId === landlordId);

    if (tenantStated && landlordStated) {
      await this.prisma.mediationCase.update({
        where: { id: caseId },
        data: { status: 'BOTH_STATED' },
      });
      // Trigger AI analysis asynchronously
      this.analyzeCase(caseId).catch((err: Error) => {
        this.logger.error(`Failed to analyze case ${caseId}: ${err.message}`);
      });
    } else {
      await this.prisma.mediationCase.update({
        where: { id: caseId },
        data: { status: 'WAITING_RESPONSE' },
      });
    }

    return statement;
  }

  async uploadEvidence(caseId: string, userId: string, files: MulterFile[]) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: { contract: true },
    });

    if (!mediationCase) throw new NotFoundException('Caso no encontrado.');

    const { tenantId, landlordId } = mediationCase.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este caso.');
    }

    const evidenceItems = await Promise.all(
      files.map(async (file) => {
        const key = `mediation/${caseId}/evidence/${userId}-${Date.now()}-${file.originalname}`;
        const fileUrl = await this.s3.uploadFile(file.buffer, key, file.mimetype);

        return this.prisma.caseEvidence.create({
          data: {
            caseId,
            userId,
            fileUrl,
            fileType: file.mimetype,
            fileName: file.originalname,
          },
        });
      }),
    );

    return evidenceItems;
  }

  async analyzeCase(caseId: string) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: {
        statements: true,
        contract: true,
      },
    });

    if (!mediationCase) return;

    await this.prisma.mediationCase.update({
      where: { id: caseId },
      data: { status: 'AI_ANALYZING' },
    });

    const tenantStatement =
      mediationCase.statements.find(
        (s) => s.userId === mediationCase.contract.tenantId,
      )?.content ?? '';

    const landlordStatement =
      mediationCase.statements.find(
        (s) => s.userId === mediationCase.contract.landlordId,
      )?.content ?? '';

    const proposal = await this.claude.generateMediationProposal({
      tenantStatement,
      landlordStatement,
      category: mediationCase.category,
      jurisprudence: [],
    });

    await this.prisma.proposal.create({
      data: {
        caseId,
        legalFramework: proposal.legalFramework,
        analysis: proposal.analysis,
        suggestion: proposal.suggestion,
        commitments: proposal.commitments,
        deadlineDays: proposal.deadlineDays,
      },
    });

    await this.prisma.mediationCase.update({
      where: { id: caseId },
      data: { status: 'PROPOSAL_READY' },
    });
  }

  async getCase(caseId: string, userId: string) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: {
        contract: { select: { tenantId: true, landlordId: true, propertyId: true } },
        openedBy: { select: { firstName: true, lastName: true } },
        statements: { orderBy: { createdAt: 'asc' } },
        evidence: { orderBy: { createdAt: 'asc' } },
        proposals: { orderBy: { createdAt: 'desc' } },
        resolution: true,
      },
    });

    if (!mediationCase) throw new NotFoundException('Caso no encontrado.');

    const { tenantId, landlordId } = mediationCase.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este caso.');
    }

    return mediationCase;
  }

  async listCases(userId: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { OR: [{ tenantId: userId }, { landlordId: userId }] },
      select: { id: true },
    });

    const contractIds = contracts.map((c) => c.id);

    return this.prisma.mediationCase.findMany({
      where: { contractId: { in: contractIds } },
      orderBy: { createdAt: 'desc' },
      include: {
        openedBy: { select: { firstName: true, lastName: true } },
        contract: { select: { propertyId: true } },
        proposals: { select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async acceptProposal(caseId: string, userId: string) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: {
        contract: true,
        proposals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!mediationCase) throw new NotFoundException('Caso no encontrado.');

    const { tenantId, landlordId } = mediationCase.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este caso.');
    }

    const latestProposal = mediationCase.proposals[0];
    if (!latestProposal) {
      throw new BadRequestException('No hay propuesta para aceptar.');
    }

    const isTenant = userId === tenantId;

    const updated = await this.prisma.proposal.update({
      where: { id: latestProposal.id },
      data: {
        acceptedByTenant: isTenant ? true : latestProposal.acceptedByTenant,
        acceptedByLandlord: !isTenant ? true : latestProposal.acceptedByLandlord,
      },
    });

    if (updated.acceptedByTenant && updated.acceptedByLandlord) {
      await this.prisma.mediationCase.update({
        where: { id: caseId },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });

      await this.prisma.resolution.create({
        data: {
          caseId,
          description: updated.suggestion,
          isHuman: false,
        },
      });
    } else {
      await this.prisma.mediationCase.update({
        where: { id: caseId },
        data: { status: 'ACCEPTED' },
      });
    }

    return updated;
  }

  async escalate(caseId: string, userId: string) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: { id: caseId },
      include: { contract: true },
    });

    if (!mediationCase) throw new NotFoundException('Caso no encontrado.');

    const { tenantId, landlordId } = mediationCase.contract;
    if (userId !== tenantId && userId !== landlordId) {
      throw new ForbiddenException('Sin acceso a este caso.');
    }

    return this.prisma.mediationCase.update({
      where: { id: caseId },
      data: { status: 'ESCALATED' },
    });
  }
}
