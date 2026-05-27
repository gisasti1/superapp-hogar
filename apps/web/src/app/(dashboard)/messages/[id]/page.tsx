'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convo, isLoading: loadingConvo } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationsApi.get(id),
  });

  // Poll de mensajes cada 4 segundos. Suficiente para un chat MVP — para
  // tiempo real real (gateway con WebSockets) iríamos a otra arquitectura.
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => conversationsApi.messages(id),
    refetchInterval: 4_000,
  });

  const { mutate: send, isPending } = useMutation({
    mutationFn: (content: string) => conversationsApi.send(id, content),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Auto-scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (loadingConvo) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!convo) return <p className="text-gray-500">Conversación no encontrada.</p>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) send(trimmed);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-14rem)]">
      {/* Header del chat */}
      <div className="card p-3 mb-3 flex items-center gap-3">
        <Link href="/messages" className="text-sm text-gray-500 hover:text-gray-700 px-1">←</Link>
        <div className="w-10 h-10 rounded-full bg-habitta-beige/40 text-habitta-earth font-semibold flex items-center justify-center flex-shrink-0">
          {convo.other.firstName?.[0]}{convo.other.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{convo.other.firstName} {convo.other.lastName}</p>
          {convo.contract?.property?.address && (
            <Link href={`/contracts/${convo.contract.id}`} className="text-xs text-habitta-terra hover:underline">
              📄 {convo.contract.property.address}
            </Link>
          )}
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 card p-4 overflow-y-auto flex flex-col gap-2">
        {loadingMsgs ? (
          <div className="text-center text-gray-400 text-sm py-8">Cargando...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Aún no hay mensajes. ¡Mandá el primero! 👋
          </div>
        ) : (
          messages.map((m: any) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-habitta-terra text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-habitta-sand' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    {mine && m.readAt && ' ✓✓'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <textarea
          className="input flex-1 min-h-[44px] max-h-32 resize-none"
          placeholder="Escribí un mensaje..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          maxLength={4000}
          rows={1}
        />
        <button
          type="submit"
          disabled={!text.trim() || isPending}
          className="btn-primary px-4"
        >
          ➤
        </button>
      </form>
      <p className="text-[10px] text-gray-400 mt-1 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
    </div>
  );
}
