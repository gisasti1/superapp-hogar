'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

function timeAgo(d: string): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleDateString('es-AR');
}

export default function MessagesPage() {
  const { data: convos = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
    refetchInterval: 15_000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Chateá con propietarios e inquilinos directamente desde la app.
        </p>
      </div>

      {convos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="💬"
            title="Sin conversaciones"
            description="Cuando aprueben una solicitud de alquiler o tengas un contrato, vas a poder chatear con la contraparte desde acá."
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden divide-y divide-gray-100">
          {convos.map((c: any) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="block px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-habitta-beige/40 text-habitta-earth font-semibold flex items-center justify-center flex-shrink-0">
                  {c.other.firstName?.[0]}{c.other.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${c.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {c.other.firstName} {c.other.lastName}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  {c.contract?.property?.address && (
                    <p className="text-[10px] text-habitta-terra mb-0.5">
                      📄 {c.contract.property.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'}`}>
                      {c.lastMessagePreview ?? 'Sin mensajes todavía'}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="bg-habitta-sand0 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
