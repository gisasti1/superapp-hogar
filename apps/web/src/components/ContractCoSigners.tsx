'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractPartiesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Sección "Co-firmantes" para el detalle del contrato.
 * - Muestra primaries (tenant/landlord) + cosigners por lado
 * - Si soy primary o cosigner ACCEPTED de un lado, puedo invitar a otro
 * - Si tengo un inviteToken (= soy invitador) puedo compartirlo
 * - Las parties INVITED muestran el estado, las ACCEPTED muestran ✓
 */
export function ContractCoSigners({ contractId, locked }: { contractId: string; locked?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['contract-parties', contractId],
    queryFn:  () => contractPartiesApi.list(contractId),
  });
  const [inviting, setInviting] = useState<'TENANT' | 'LANDLORD' | null>(null);

  const inviteMut = useMutation({
    mutationFn: (vars: { email: string; side: 'TENANT' | 'LANDLORD' }) =>
      contractPartiesApi.invite(contractId, vars),
    onSuccess: () => { setInviting(null); qc.invalidateQueries({ queryKey: ['contract-parties', contractId] }); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error al invitar'),
  });
  const removeMut = useMutation({
    mutationFn: (partyId: string) => contractPartiesApi.remove(contractId, partyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-parties', contractId] }),
  });

  if (isLoading) return <div className="card flex justify-center py-6"><LoadingSpinner /></div>;
  if (!data) return null;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 text-lg">👥 Quiénes firman</h2>
        {locked && <span className="text-[10px] text-amber-600 font-medium">🔒 Contrato firmado — no se pueden sumar más</span>}
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Cada lado puede sumar a otra persona para que firme y pueda gestionar el contrato.
        Por ejemplo: una pareja como inquilinos, dos propietarios condóminos.
      </p>

      <SideBlock title="Inquilino" side="TENANT" data={data.tenant} locked={locked}
        onInvite={() => setInviting('TENANT')}
        onRemove={(id) => removeMut.mutate(id)}
      />
      <SideBlock title="Propietario" side="LANDLORD" data={data.landlord} locked={locked}
        onInvite={() => setInviting('LANDLORD')}
        onRemove={(id) => removeMut.mutate(id)}
      />

      {inviting && (
        <InviteModal
          side={inviting}
          onClose={() => setInviting(null)}
          onSubmit={(email) => inviteMut.mutate({ email, side: inviting })}
          isPending={inviteMut.isPending}
        />
      )}
    </div>
  );
}

function SideBlock({ title, side, data, locked, onInvite, onRemove }: {
  title: string;
  side: 'TENANT' | 'LANDLORD';
  data: any;
  locked?: boolean;
  onInvite: () => void;
  onRemove: (partyId: string) => void;
}) {
  const canInvite = !locked && data.primary?.isMe;

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
        {canInvite && (
          <button onClick={onInvite} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            + Invitar
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        <PersonRow person={data.primary} isPrimary />
        {data.cosigners.map((c: any) => (
          <PersonRow
            key={c.id}
            person={c}
            onRemove={canInvite && c.status !== 'REMOVED' ? () => {
              if (confirm('¿Quitar este co-firmante?')) onRemove(c.id);
            } : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

function PersonRow({ person, isPrimary, onRemove }: {
  person: any;
  isPrimary?: boolean;
  onRemove?: () => void;
}) {
  const display = person.user
    ? `${person.user.firstName ?? ''} ${person.user.lastName ?? ''}`.trim() || person.user.email
    : person.invitedEmail;
  return (
    <li className="flex items-center gap-2 text-sm py-1">
      <span className="shrink-0 text-base">{isPrimary ? '👤' : '👥'}</span>
      <span className={`flex-1 ${person.isMe ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {display}
        {person.isMe && <span className="ml-1 text-[10px] text-emerald-600">(vos)</span>}
      </span>
      <PartyBadge status={person.status} isPrimary={isPrimary} />
      {person.inviteToken && (
        <CopyTokenButton token={person.inviteToken} contractId={person.contractId} />
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-500 text-sm">🗑</button>
      )}
    </li>
  );
}

function PartyBadge({ status, isPrimary }: { status: string; isPrimary?: boolean }) {
  if (isPrimary || status === 'ACCEPTED') return <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ ACEPTÓ</span>;
  if (status === 'INVITED')                return <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">PENDIENTE</span>;
  if (status === 'DECLINED')               return <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">RECHAZÓ</span>;
  if (status === 'REMOVED')                return <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">QUITADO</span>;
  return null;
}

function CopyTokenButton({ token, contractId }: { token: string; contractId?: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/contracts/${contractId ?? ''}/invite/${token}`
    : '';
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
      title="Copiar link de invitación"
    >
      {copied ? '✓ copiado' : '🔗 copiar'}
    </button>
  );
}

function InviteModal({ side, onClose, onSubmit, isPending }: {
  side: 'TENANT' | 'LANDLORD';
  onClose: () => void;
  onSubmit: (email: string) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 text-lg">
          Invitar co-firmante como {side === 'TENANT' ? 'inquilino' : 'propietario'}
        </h3>
        <p className="text-sm text-gray-500">
          La persona va a recibir el contrato. Si acepta, queda integrada y puede firmarlo y gestionarlo igual que vos.
        </p>
        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="persona@email.com"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => email && onSubmit(email)}
            disabled={!email || isPending}
            className="btn-primary text-sm"
          >
            {isPending ? 'Invitando…' : 'Enviar invitación'}
          </button>
        </div>
      </div>
    </div>
  );
}
