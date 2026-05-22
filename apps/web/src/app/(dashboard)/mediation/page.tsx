'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { mediationApi } from '@/lib/api';
import { CaseStatus, CaseCategory } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_VARIANT: Record<string, string> = {
  [CaseStatus.OPENED]: 'info',
  [CaseStatus.WAITING_RESPONSE]: 'warning',
  [CaseStatus.BOTH_STATED]: 'info',
  [CaseStatus.AI_ANALYZING]: 'info',
  [CaseStatus.PROPOSAL_READY]: 'warning',
  [CaseStatus.ACCEPTED]: 'success',
  [CaseStatus.ESCALATED]: 'error',
  [CaseStatus.RESOLVED]: 'success',
  [CaseStatus.CLOSED]: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  [CaseStatus.OPENED]: 'Abierto',
  [CaseStatus.WAITING_RESPONSE]: 'Esperando resp.',
  [CaseStatus.BOTH_STATED]: 'Ambos declararon',
  [CaseStatus.AI_ANALYZING]: 'Analizando',
  [CaseStatus.PROPOSAL_READY]: 'Propuesta lista',
  [CaseStatus.ACCEPTED]: 'Aceptado',
  [CaseStatus.ESCALATED]: 'Escalado',
  [CaseStatus.RESOLVED]: 'Resuelto',
  [CaseStatus.CLOSED]: 'Cerrado',
};

const CATEGORY_LABELS: Record<string, string> = {
  [CaseCategory.REPAIRS]: '🔧 Reparaciones',
  [CaseCategory.DEPOSIT_RETURN]: '💰 Devolución de depósito',
  [CaseCategory.RENT_INCREASE]: '📈 Aumento de alquiler',
  [CaseCategory.NOISE]: '🔊 Ruidos',
  [CaseCategory.EXPENSES]: '📋 Expensas',
  [CaseCategory.EARLY_TERMINATION]: '📃 Rescisión anticipada',
  [CaseCategory.OTHER]: '❓ Otro',
};

const ACTIVE_STATUSES = new Set([
  CaseStatus.OPENED,
  CaseStatus.WAITING_RESPONSE,
  CaseStatus.BOTH_STATED,
  CaseStatus.AI_ANALYZING,
  CaseStatus.PROPOSAL_READY,
]);

export default function MediationPage() {
  const { data: cases, isLoading } = useQuery({
    queryKey: ['mediation-cases'],
    queryFn: mediationApi.listCases,
  });

  const active = cases?.filter((c: any) => ACTIVE_STATUSES.has(c.status)) ?? [];
  const resolved = cases?.filter((c: any) => c.status === CaseStatus.RESOLVED) ?? [];
  const escalated = cases?.filter((c: any) => c.status === CaseStatus.ESCALATED) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mediación</h1>
          <p className="text-gray-500 mt-1">Resolvemos conflictos en 72hs con IA</p>
        </div>
        <Link href="/mediation/new" className="btn-primary">
          + Abrir caso
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{active.length}</p>
          <p className="text-sm text-gray-500 mt-1">Casos activos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{resolved.length}</p>
          <p className="text-sm text-gray-500 mt-1">Resueltos</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-500">{escalated.length}</p>
          <p className="text-sm text-gray-500 mt-1">Escalados</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card py-16">
          <LoadingSpinner />
        </div>
      ) : !cases?.length ? (
        <div className="card">
          <EmptyState
            icon="⭐"
            title="No tenés casos de mediación"
            description="Cuando surja un conflicto, abrí un caso y lo resolveremos en 72hs con IA y jurisprudencia argentina."
            action={
              <Link href="/mediation/new" className="btn-primary">
                Abrir primer caso
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c: any) => (
            <Link
              key={c.id}
              href={`/mediation/${c.id}`}
              className="card flex items-start justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                  <Badge variant={STATUS_VARIANT[c.status]}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 truncate">{c.summary}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <span className="text-brand-600 text-sm font-medium shrink-0">Ver →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
