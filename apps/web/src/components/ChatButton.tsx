'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';

/**
 * Botón "💬 Chatear" reutilizable. Crea (o reusa) la conversación 1:1 con
 * el otherUserId pasado y redirige a /messages/[id].
 */
export function ChatButton({
  otherUserId,
  contractId,
  rentalRequestId,
  label = '💬 Chatear',
  className = 'btn-secondary text-sm',
}: {
  otherUserId: string;
  contractId?: string;
  rentalRequestId?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => conversationsApi.start({ otherUserId, contractId, rentalRequestId }),
    onSuccess: (convo: any) => router.push(`/messages/${convo.id}`),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'No se pudo iniciar el chat'),
  });

  return (
    <>
      <button
        onClick={() => mutate()}
        disabled={isPending}
        className={className}
      >
        {isPending ? 'Abriendo...' : label}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </>
  );
}
