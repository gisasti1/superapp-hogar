'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractTemplatesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const TYPE_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  RESIDENTIAL: { label: 'Residencial',  icon: '🏠', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  COMMERCIAL:  { label: 'Comercial',    icon: '🏢', color: 'text-violet-700', bg: 'bg-violet-50' },
  SEASONAL:    { label: 'Temporario',   icon: '🏖️', color: 'text-amber-700',  bg: 'bg-amber-50'  },
  ROOM:        { label: 'Habitación',   icon: '🛏️', color: 'text-emerald-700',bg: 'bg-emerald-50'},
};

const VARIABLE_CHIPS = [
  '{{landlordName}}','{{landlordDni}}','{{tenantName}}','{{tenantDni}}',
  '{{address}}','{{city}}','{{startDate}}','{{endDate}}',
  '{{monthlyRent}}','{{currency}}','{{deposit}}','{{today}}',
];

function TemplateCard({ tpl, onDuplicate, onDelete }: {
  tpl: any;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = TYPE_CFG[tpl.type] ?? TYPE_CFG.RESIDENTIAL;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className={`h-1.5 ${cfg.bg.replace('bg-', 'bg-').replace('-50','-300')}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
            {tpl.isBuiltIn && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                Sistema
              </span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">{tpl.title}</h3>
        {tpl.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{tpl.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/contracts/templates/${tpl.id}`}
            className="flex-1 text-center text-xs font-semibold bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ver / Editar
          </Link>
          <button
            onClick={() => onDuplicate(tpl.id)}
            className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            title="Crear copia editable"
          >
            📋 Copiar
          </button>
          {!tpl.isBuiltIn && (
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${tpl.title}"?`)) onDelete(tpl.id);
              }}
              className="text-xs font-medium text-red-500 border border-red-100 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractTemplatesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('');
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType]   = useState('RESIDENTIAL');
  const [newContent, setNewContent] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contract-templates', filter],
    queryFn: () => contractTemplatesApi.list(filter || undefined),
  });

  const duplicateMutation = useMutation({
    mutationFn: contractTemplatesApi.duplicate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-templates'] }),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: contractTemplatesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-templates'] }),
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  const createMutation = useMutation({
    mutationFn: () => contractTemplatesApi.create({ title: newTitle, type: newType, content: newContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      setShowNew(false); setNewTitle(''); setNewContent('');
    },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  const builtIn  = (templates as any[]).filter(t => t.isBuiltIn);
  const custom   = (templates as any[]).filter(t => !t.isBuiltIn);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.3) 39px,rgba(255,255,255,0.3) 40px)', backgroundSize: '100% 40px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Contratos</p>
            <h1 className="text-2xl font-extrabold">Plantillas de contratos</h1>
            <p className="mt-1 text-sm opacity-80 max-w-md">
              Modelos base con texto de Ley 27.551. Usalos tal cual o creá tus propias versiones editables.
            </p>
          </div>
          <button
            onClick={() => setShowNew(s => !s)}
            className="shrink-0 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition border border-white/30"
          >
            + Nueva plantilla
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: '', label: 'Todas' }, ...Object.entries(TYPE_CFG).map(([k,v]) => ({ key: k, label: v.label }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${filter === key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create new */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-900">Nueva plantilla personalizada</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nombre *</label>
              <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ej: Mi modelo residencial CABA" />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={newType} onChange={e => setNewType(e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Texto de la plantilla *</label>
              <span className="text-xs text-gray-400">Usá los {'{{placeholders}}'}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {VARIABLE_CHIPS.map(v => (
                <button key={v} type="button" onClick={() => setNewContent(c => c + v)}
                  className="text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition">
                  {v}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-[240px] font-mono text-xs resize-y"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="CONTRATO DE LOCACIÓN&#10;&#10;En {{city}}, a los {{today}}, entre {{landlordName}} y {{tenantName}}…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || !newContent.trim() || createMutation.isPending}
              className="btn-primary text-sm"
            >
              {createMutation.isPending ? 'Guardando…' : 'Crear plantilla'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Built-in */}
          {builtIn.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                Plantillas del sistema — Ley 27.551 🇦🇷
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {builtIn.map((t: any) => (
                  <TemplateCard key={t.id} tpl={t}
                    onDuplicate={id => duplicateMutation.mutate(id)}
                    onDelete={id => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Custom */}
          {custom.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                Mis plantillas personalizadas
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {custom.map((t: any) => (
                  <TemplateCard key={t.id} tpl={t}
                    onDuplicate={id => duplicateMutation.mutate(id)}
                    onDelete={id => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </section>
          )}

          {(templates as any[]).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📄</p>
              <p>No hay plantillas con ese filtro.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
