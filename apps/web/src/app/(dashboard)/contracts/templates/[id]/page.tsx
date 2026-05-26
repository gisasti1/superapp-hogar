'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractTemplatesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const VARIABLES = [
  { key: '{{landlordName}}',    label: 'Nombre locador' },
  { key: '{{landlordDni}}',     label: 'DNI locador' },
  { key: '{{landlordAddress}}', label: 'Domicilio locador' },
  { key: '{{tenantName}}',      label: 'Nombre locatario' },
  { key: '{{tenantDni}}',       label: 'DNI locatario' },
  { key: '{{tenantAddress}}',   label: 'Domicilio locatario' },
  { key: '{{address}}',         label: 'Dirección inmueble' },
  { key: '{{city}}',            label: 'Ciudad' },
  { key: '{{province}}',        label: 'Provincia' },
  { key: '{{rooms}}',           label: 'Ambientes' },
  { key: '{{startDate}}',       label: 'Fecha inicio' },
  { key: '{{endDate}}',         label: 'Fecha fin' },
  { key: '{{monthlyRent}}',     label: 'Alquiler mensual' },
  { key: '{{currency}}',        label: 'Moneda' },
  { key: '{{deposit}}',         label: 'Depósito' },
  { key: '{{today}}',           label: 'Fecha de firma' },
];

type ViewMode = 'edit' | 'preview';

export default function TemplateDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const [mode,    setMode]    = useState<ViewMode>('edit');
  const [content, setContent] = useState('');
  const [title,   setTitle]   = useState('');
  const [dirty,   setDirty]   = useState(false);

  // Preview vars — sample values
  const [prevVars, setPrevVars] = useState({
    landlordName:    'Carlos Propietario',
    landlordDni:     '25.123.456',
    landlordAddress: 'Av. Santa Fe 1234, CABA',
    tenantName:      'Ana Inquilina',
    tenantDni:       '30.987.654',
    tenantAddress:   'Av. Corrientes 5678, CABA',
    address:         'Gorriti 4321, Piso 2 Dto A',
    city:            'Buenos Aires',
    province:        'Buenos Aires',
    rooms:           '2',
    startDate:       '01/01/2026',
    endDate:         '01/01/2029',
    monthlyRent:     '480.000',
    currency:        'ARS',
    deposit:         '480.000',
    today:           new Date().toLocaleDateString('es-AR'),
  });

  const { data: tpl, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => contractTemplatesApi.get(id),
  });

  useEffect(() => {
    if (tpl) {
      setContent(tpl.content);
      setTitle(tpl.title);
    }
  }, [tpl]);

  const updateMutation = useMutation({
    mutationFn: () => contractTemplatesApi.update(id, { title, content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['template', id] }); setDirty(false); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error al guardar'),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => contractTemplatesApi.duplicate(id),
    onSuccess: (copy: any) => { qc.invalidateQueries({ queryKey: ['contract-templates'] }); router.push(`/contracts/templates/${copy.id}`); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Error'),
  });

  const insertVar = (v: string) => {
    setContent(c => c + v);
    setDirty(true);
  };

  const previewContent = () => {
    let out = content;
    for (const [key, val] of Object.entries(prevVars)) {
      out = out.replaceAll(`{{${key}}}`, val);
    }
    return out;
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!tpl) return (
    <div className="card text-center py-12">
      <p className="text-gray-500">Plantilla no encontrada.</p>
      <Link href="/contracts/templates" className="text-indigo-600 text-sm mt-2 inline-block">← Volver</Link>
    </div>
  );

  const isBuiltIn = tpl.isBuiltIn;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/contracts/templates" className="hover:text-indigo-600 transition-colors">Plantillas</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{tpl.title}</span>
          {isBuiltIn && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Sistema</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {(['edit','preview'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {m === 'edit' ? '✏️ Editar' : '👁 Vista previa'}
              </button>
            ))}
          </div>

          {isBuiltIn ? (
            <button onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}
              className="btn-secondary text-sm"
            >
              {duplicateMutation.isPending ? 'Copiando…' : '📋 Crear copia editable'}
            </button>
          ) : (
            <button onClick={() => updateMutation.mutate()} disabled={!dirty || updateMutation.isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Guardando…' : dirty ? '💾 Guardar cambios' : 'Sin cambios'}
            </button>
          )}

          <Link
            href={`/contracts/new?templateId=${id}`}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            📄 Usar en contrato →
          </Link>
        </div>
      </div>

      {isBuiltIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>🔒</span>
          <span>Esta es una plantilla del sistema y no se puede editar directamente. <button onClick={() => duplicateMutation.mutate()} className="font-semibold underline">Creá una copia</button> para personalizarla.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">

        {/* ── Main editor / preview ─── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
            {mode === 'edit' ? (
              <input
                className="flex-1 font-bold text-gray-900 bg-transparent outline-none text-base placeholder:text-gray-400"
                value={title}
                onChange={e => { setTitle(e.target.value); setDirty(true); }}
                placeholder="Título de la plantilla"
                disabled={isBuiltIn}
              />
            ) : (
              <h2 className="font-bold text-gray-900">{title}</h2>
            )}
          </div>

          {mode === 'edit' ? (
            <textarea
              className="w-full p-5 font-mono text-xs text-gray-700 leading-relaxed min-h-[600px] resize-y outline-none"
              value={content}
              onChange={e => { setContent(e.target.value); setDirty(true); }}
              disabled={isBuiltIn}
              placeholder="Pegá o escribí el texto del contrato…"
            />
          ) : (
            <pre className="p-5 font-sans text-xs text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[600px] overflow-auto">
              {previewContent()}
            </pre>
          )}
        </div>

        {/* ── Sidebar ─── */}
        <div className="space-y-4">

          {/* Variables insert */}
          {!isBuiltIn && mode === 'edit' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Insertar variable
              </p>
              <div className="flex flex-col gap-1">
                {VARIABLES.map(v => (
                  <button key={v.key} onClick={() => insertVar(v.key)}
                    className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-50 text-left transition-colors group"
                  >
                    <span className="font-mono text-indigo-600 group-hover:text-indigo-800">{v.key}</span>
                    <span className="text-gray-400 text-[10px]">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview vars */}
          {mode === 'preview' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Datos de muestra</p>
              <div className="space-y-2">
                {Object.entries(prevVars).map(([k, v]) => (
                  <div key={k}>
                    <label className="text-[10px] text-gray-400 font-mono">{`{{${k}}}`}</label>
                    <input
                      value={v}
                      onChange={e => setPrevVars(p => ({ ...p, [k]: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 mt-0.5"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-xs text-gray-500 space-y-1.5">
            <p><strong className="text-gray-700">Tipo:</strong> {tpl.type}</p>
            {tpl.createdBy && <p><strong className="text-gray-700">Creada por:</strong> {tpl.createdBy.firstName} {tpl.createdBy.lastName}</p>}
            <p><strong className="text-gray-700">Actualizada:</strong> {new Date(tpl.updatedAt ?? tpl.createdAt).toLocaleDateString('es-AR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
