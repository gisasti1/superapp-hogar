'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-100 text-blue-700' },
  QUOTED: { label: 'Cotizado', color: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Aceptado', color: 'bg-amber-100 text-amber-800' },
  IN_PROGRESS: { label: 'En curso', color: 'bg-amber-100 text-amber-800' },
  COMPLETED: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-600' },
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: servicesApi.getMyBookings,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      servicesApi.reviewBooking(id, { rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      setReviewingId(null);
      setComment('');
      setRating(5);
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'No se pudo enviar la reseña'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis reservas de servicios</h1>
          <p className="text-gray-500 text-sm mt-1">Trabajos solicitados a prestadores del marketplace</p>
        </div>
        <Link href="/services" className="btn-secondary text-sm">
          🛠 Buscar prestadores
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🛠"
            title="Sin reservas todavía"
            description="Cuando contrates un servicio del marketplace, aparece acá."
            action={<Link href="/services" className="btn-primary">Ver prestadores</Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const status = STATUS_LABELS[b.status] ?? STATUS_LABELS.REQUESTED;
            const canReview = b.status === 'COMPLETED' && !b.review;
            const isReviewing = reviewingId === b.id;
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.provider.businessName}</p>
                    <p className="text-xs text-gray-500">{b.provider.category} · {b.category}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <p className="text-sm text-gray-600">{b.description}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {b.address}</p>

                {b.quotedAmount && (
                  <p className="text-sm font-semibold text-gray-900 mt-2">
                    Cotizado: ${Number(b.quotedAmount).toLocaleString('es-AR')} ARS
                  </p>
                )}

                {/* Reseña ya existente */}
                {b.review && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tu reseña</p>
                    <div className="text-amber-500 text-sm">
                      {'★'.repeat(b.review.rating)}{'☆'.repeat(5 - b.review.rating)}
                    </div>
                    {b.review.comment && (
                      <p className="text-sm text-gray-600 mt-1">"{b.review.comment}"</p>
                    )}
                  </div>
                )}

                {/* Botón "Calificar" / form inline */}
                {canReview && !isReviewing && (
                  <button
                    onClick={() => setReviewingId(b.id)}
                    className="btn-primary text-sm mt-3"
                  >
                    ⭐ Calificar el trabajo
                  </button>
                )}

                {isReviewing && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-sm font-medium text-gray-700">¿Cómo fue el trabajo?</p>
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
                      placeholder="Contá brevemente cómo fue (opcional)"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewMutation.mutate({ id: b.id, rating, comment: comment || undefined })}
                        disabled={reviewMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        {reviewMutation.isPending ? 'Enviando...' : `Enviar (${rating}★)`}
                      </button>
                      <button
                        onClick={() => { setReviewingId(null); setComment(''); setRating(5); }}
                        className="btn-secondary text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
