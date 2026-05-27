'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { contractPartiesApi } from '@/lib/api';

export default function AcceptInvitePage() {
  const { id, token } = useParams<{ id: string; token: string }>();
  const router = useRouter();
  const [done, setDone] = useState<'ACCEPTED' | 'DECLINED' | null>(null);

  const acceptMut = useMutation({
    mutationFn: () => contractPartiesApi.accept(id, token),
    onSuccess: () => { setDone('ACCEPTED'); setTimeout(() => router.push(`/contracts/${id}`), 1200); },
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'No se pudo aceptar la invitación'),
  });
  const declineMut = useMutation({
    mutationFn: () => contractPartiesApi.decline(id, token),
    onSuccess: () => setDone('DECLINED'),
    onError:   (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="max-w-md mx-auto py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
        <div className="text-5xl">📩</div>
        <h1 className="text-xl font-extrabold text-gray-900">Invitación a co-firmar un contrato</h1>
        <p className="text-sm text-gray-500">
          Te invitaron a sumarte como co-firmante de un contrato de alquiler.
          Si aceptás, vas a poder firmarlo y gestionarlo igual que la otra persona.
        </p>

        {done === 'ACCEPTED' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3">
            ✓ Aceptaste la invitación. Te llevamos al contrato…
          </div>
        )}
        {done === 'DECLINED' && (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg p-3">
            Rechazaste la invitación.
          </div>
        )}

        {!done && (
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => declineMut.mutate()}
              disabled={declineMut.isPending}
              className="btn-secondary text-sm"
            >
              No, gracias
            </button>
            <button
              onClick={() => acceptMut.mutate()}
              disabled={acceptMut.isPending}
              className="btn-primary text-sm"
            >
              {acceptMut.isPending ? 'Aceptando…' : '✓ Aceptar e integrarme'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
