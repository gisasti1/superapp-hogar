'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractReviewsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Bloque de reseñas que va dentro del detalle de un contrato.
 * Muestra las reseñas existentes y, si el usuario es parte del contrato
 * y aún no escribió la suya, muestra el form para crearla.
 */
export function ContractReviews({
  contractId,
  contractStatus,
}: {
  contractId: string;
  contractStatus: string;
}) {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: reviews = [] } = useQuery({
    queryKey: ['contract-reviews', contractId],
    queryFn: () => contractReviewsApi.listByContract(contractId),
  });

  const myReview = reviews.find((r: any) => r.author.id === user?.id);
  // Sólo se puede reseñar contratos ACTIVE, TERMINATED o EXPIRED
  const canReview = ['ACTIVE', 'TERMINATED', 'EXPIRED'].includes(contractStatus) && !myReview;

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => contractReviewsApi.create(contractId, { rating, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-reviews', contractId] });
      setComment('');
      setRating(5);
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'No se pudo enviar la reseña'),
  });

  return (
    <div className="card">
      <h2 className="font-bold text-gray-900 mb-3">Reseñas</h2>

      {reviews.length === 0 && !canReview && (
        <p className="text-sm text-gray-500">Todavía no hay reseñas para este contrato.</p>
      )}

      {/* Listado de reseñas existentes */}
      {reviews.length > 0 && (
        <div className="space-y-3 mb-4">
          {reviews.map((r: any) => (
            <div key={r.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {r.author.firstName} {r.author.lastName}
                </p>
                <div className="text-amber-500 text-sm">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </div>
              </div>
              {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(r.createdAt).toLocaleDateString('es-AR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form para dejar reseña */}
      {canReview && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Dejá tu reseña sobre la contraparte:</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`text-2xl transition-transform hover:scale-110 ${
                  n <= rating ? 'text-amber-500' : 'text-gray-300'
                }`}
                aria-label={`${n} estrellas`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            className="input text-sm min-h-[80px]"
            placeholder="¿Cómo fue la experiencia? (opcional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={2000}
          />
          <button
            onClick={() => submit()}
            disabled={isPending || rating < 1}
            className="btn-primary text-sm"
          >
            {isPending ? 'Enviando...' : `Enviar reseña (${rating} ★)`}
          </button>
        </div>
      )}

      {myReview && (
        <p className="text-xs text-gray-400 mt-2">Ya escribiste tu reseña para este contrato.</p>
      )}
    </div>
  );
}
