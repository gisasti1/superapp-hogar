'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mediationApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { CaseStatus, MEDIATION_HUMAN_COST_USD } from '@superapp/shared';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const STATUS_VARIANT: Record<string, string> = {
  OPENED: 'info', WAITING_RESPONSE: 'warning', BOTH_STATED: 'info',
  AI_ANALYZING: 'info', PROPOSAL_READY: 'warning', ACCEPTED: 'success',
  ESCALATED: 'error', RESOLVED: 'success', CLOSED: 'neutral',
};
const STATUS_LABELS: Record<string, string> = {
  OPENED: 'Abierto', WAITING_RESPONSE: 'Esperando respuesta', BOTH_STATED: 'Ambos declararon',
  AI_ANALYZING: 'IA analizando...', PROPOSAL_READY: 'Propuesta lista', ACCEPTED: 'Aceptado',
  ESCALATED: 'Escalado', RESOLVED: 'Resuelto', CLOSED: 'Cerrado',
};

const TIMELINE_STEPS = [
  { key: 'OPENED', label: 'Caso abierto' },
  { key: 'WAITING_RESPONSE', label: 'Esperando declaración' },
  { key: 'BOTH_STATED', label: 'Ambas partes declararon' },
  { key: 'AI_ANALYZING', label: 'IA analizando' },
  { key: 'PROPOSAL_READY', label: 'Propuesta generada' },
  { key: 'ACCEPTED', label: 'Resuelto' },
];

const STATUS_ORDER = ['OPENED', 'WAITING_RESPONSE', 'BOTH_STATED', 'AI_ANALYZING', 'PROPOSAL_READY', 'ACCEPTED'];

const statementSchema = z.object({
  statement: z.string().min(50, 'Escribí al menos 50 caracteres'),
});
type StatementForm = z.infer<typeof statementSchema>;

const messageSchema = z.object({
  content: z.string().min(1, 'Escribí un mensaje'),
});
type MessageForm = z.infer<typeof messageSchema>;

export default function MediationCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['mediation-case', id],
    queryFn: () => mediationApi.getCase(id),
  });

  const { data: messages } = useQuery({
    queryKey: ['mediation-messages', id],
    queryFn: () => mediationApi.getMessages(id),
    refetchInterval: 10_000,
  });

  const statementForm = useForm<StatementForm>({
    resolver: zodResolver(statementSchema),
  });

  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
  });

  const submitStatementMutation = useMutation({
    mutationFn: (statement: string) => mediationApi.submitStatement(id, statement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mediation-case', id] });
      statementForm.reset();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => mediationApi.acceptProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mediation-case', id] }),
  });

  const escalateMutation = useMutation({
    mutationFn: () => mediationApi.escalate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mediation-case', id] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => mediationApi.sendMessage(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mediation-messages', id] });
      messageForm.reset();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-500">Caso no encontrado.</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">Volver</button>
      </div>
    );
  }

  const myStatement = caseData.statements?.find((s: any) => s.userId === user?.id);
  const otherStatement = caseData.statements?.find((s: any) => s.userId !== user?.id);
  const hasProposal = !!caseData.proposal;
  const currentStepIndex = STATUS_ORDER.indexOf(caseData.status);
  const isEscalated = caseData.status === CaseStatus.ESCALATED;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">← Volver</button>
        <h1 className="text-2xl font-bold text-gray-900">Caso de mediación</h1>
        <Badge variant={STATUS_VARIANT[caseData.status]}>
          {STATUS_LABELS[caseData.status] ?? caseData.status}
        </Badge>
      </div>

      {/* Timeline */}
      {!isEscalated && (
        <div className="card">
          <div className="flex items-center">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i < currentStepIndex;
              const active = i === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done ? 'bg-green-500 text-white' : active ? 'bg-habitta-terra text-white ring-4 ring-habitta-terra/20' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-1 text-center leading-tight max-w-16 ${
                      done || active ? 'text-gray-700 font-medium' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEscalated && (
        <div className="card bg-red-50 border-red-200">
          <p className="font-semibold text-red-700">Caso escalado a mediador humano</p>
          <p className="text-sm text-red-600 mt-1">Un mediador especializado tomará contacto en las próximas 24hs.</p>
        </div>
      )}

      {/* Case info */}
      <div className="card space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Descripción del conflicto</p>
        <p className="text-sm text-gray-700 leading-relaxed">{caseData.summary}</p>
        <p className="text-xs text-gray-400">Abierto el {new Date(caseData.createdAt).toLocaleDateString('es-AR')}</p>
      </div>

      {/* Statements */}
      <div className="card space-y-4">
        <h2 className="font-bold text-gray-900">Declaraciones</h2>

        {myStatement ? (
          <div className="bg-habitta-sand border border-habitta-olive/30 rounded-lg p-4">
            <p className="text-xs font-medium text-habitta-terra mb-1">Tu declaración</p>
            <p className="text-sm text-gray-700">{myStatement.statement}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(myStatement.createdAt).toLocaleDateString('es-AR')}
            </p>
          </div>
        ) : (
          <form onSubmit={statementForm.handleSubmit(d => submitStatementMutation.mutate(d.statement))} className="space-y-3">
            <p className="text-sm text-gray-600">Aún no enviaste tu declaración. Describí tu versión de los hechos:</p>
            <textarea
              {...statementForm.register('statement')}
              rows={5}
              className="input resize-none"
              placeholder="Describí tu versión detallada del conflicto..."
            />
            {statementForm.formState.errors.statement && (
              <p className="text-red-500 text-xs">{statementForm.formState.errors.statement.message}</p>
            )}
            <button
              type="submit"
              disabled={submitStatementMutation.isPending}
              className="btn-primary"
            >
              {submitStatementMutation.isPending ? 'Enviando...' : 'Enviar declaración'}
            </button>
          </form>
        )}

        {otherStatement ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Declaración de la contraparte</p>
            <p className="text-sm text-gray-700">{otherStatement.statement}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(otherStatement.createdAt).toLocaleDateString('es-AR')}
            </p>
          </div>
        ) : (
          myStatement && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              La contraparte aún no declaró. Tiene 72hs para hacerlo.
            </p>
          )
        )}
      </div>

      {/* AI Proposal */}
      {hasProposal && (
        <div className="card space-y-4 border-habitta-olive/30 bg-gradient-to-br from-white to-habitta-cream">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h2 className="font-bold text-gray-900">Propuesta de la IA</h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Marco legal</p>
              <p className="text-sm text-gray-700 mt-1">{caseData.proposal.legalFramework}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Análisis</p>
              <p className="text-sm text-gray-700 mt-1">{caseData.proposal.analysis}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sugerencia</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{caseData.proposal.suggestion}</p>
            </div>
            {caseData.proposal.commitments?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Compromisos</p>
                <ul className="space-y-1">
                  {caseData.proposal.commitments.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {caseData.status === CaseStatus.PROPOSAL_READY && (
            <div className="flex gap-3 pt-2">
              <button
                className="btn-primary flex-1"
                disabled={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
              >
                {acceptMutation.isPending ? 'Aceptando...' : '✅ Aceptar propuesta'}
              </button>
              <button
                className="btn-secondary flex-1"
                disabled={escalateMutation.isPending}
                onClick={() => {
                  if (confirm(`¿Querés escalar a un mediador humano por $${MEDIATION_HUMAN_COST_USD} USD?`)) {
                    escalateMutation.mutate();
                  }
                }}
              >
                {escalateMutation.isPending ? 'Escalando...' : `Escalar ($${MEDIATION_HUMAN_COST_USD} USD)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Async chat */}
      <div className="card space-y-4">
        <h2 className="font-bold text-gray-900">Chat del caso</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {!messages?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay mensajes aún.</p>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-xl px-4 py-2.5 text-sm ${
                    isMe ? 'bg-habitta-terra text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {!isMe && (
                      <p className="text-xs font-medium mb-1 opacity-60">{msg.senderName}</p>
                    )}
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-habitta-sand' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form
          onSubmit={messageForm.handleSubmit(d => sendMessageMutation.mutate(d.content))}
          className="flex gap-2"
        >
          <input
            {...messageForm.register('content')}
            type="text"
            className="input flex-1"
            placeholder="Escribí un mensaje..."
          />
          <button
            type="submit"
            disabled={sendMessageMutation.isPending}
            className="btn-primary shrink-0"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
