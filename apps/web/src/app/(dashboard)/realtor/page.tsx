'use client';

import { useState, useEffect, useRef, Suspense as _Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Cast por el doble @types/react que rompe el JSX type checking de Suspense.
const Suspense = _Suspense as any;
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realtorApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/* ─── CUIT format helper ─────────────────────────────────────────────────── */
function formatCuit(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0,2)}-${d.slice(2)}`;
  return `${d.slice(0,2)}-${d.slice(2,10)}-${d.slice(10)}`;
}

/* ─── Input row ──────────────────────────────────────────────────────────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────────────────── */
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─── Listing card ───────────────────────────────────────────────────────── */
function ListingCard({ listing }: { listing: any }) {
  const isPublished = listing.listing?.isPublished;
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {isPublished ? '● Publicado' : '○ Borrador'}
          </span>
          <span className="text-[10px] text-gray-400">
            {listing._count?.rentalRequests ?? 0} solicitudes
          </span>
        </div>
        <p className="font-semibold text-gray-900 text-sm group-hover:text-indigo-700 transition-colors truncate">
          {listing.listing?.title ?? listing.address}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{listing.address}, {listing.city}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-gray-900 text-sm">
          ${Number(listing.monthlyRent).toLocaleString('es-AR')}
        </p>
        <p className="text-[10px] text-gray-400">/ mes</p>
      </div>
    </Link>
  );
}

/* ─── Contract row ───────────────────────────────────────────────────────── */
function ContractRow({ contract }: { contract: any }) {
  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    SIGNED: 'bg-blue-50 text-blue-700',
    DRAFT: 'bg-gray-100 text-gray-500',
    TERMINATED: 'bg-red-50 text-red-600',
    EXPIRED: 'bg-amber-50 text-amber-700',
  };
  return (
    <Link
      href={`/contracts/${contract.id}`}
      className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">
          {contract.property?.address}, {contract.property?.city}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {contract.tenant?.firstName} {contract.tenant?.lastName} · {contract.tenant?.email}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor[contract.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {contract.status}
        </span>
        <p className="text-xs font-bold text-gray-700">
          ${Number(contract.monthlyAmount).toLocaleString('es-AR')}
        </p>
      </div>
    </Link>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function RealtorPage() {
  return (
    <Suspense fallback={null}>
      <RealtorPageInner />
    </Suspense>
  );
}

function RealtorPageInner() {
  const user       = useAuthStore(s => s.user);
  const qc         = useQueryClient();
  const params     = useSearchParams();
  const isWelcome  = params.get('welcome') === '1';
  const logoRef    = useRef<HTMLInputElement>(null);

  const [editing,   setEditing]   = useState(false);
  const [showWelcome, setShowWelcome] = useState(isWelcome);

  // Form state
  const [agencyName,      setAgencyName]      = useState('');
  const [cuit,            setCuit]            = useState('');
  const [licenseNumber,   setLicenseNumber]   = useState('');
  const [licenseAuth,     setLicenseAuth]     = useState('');
  const [licenseExpiry,   setLicenseExpiry]   = useState('');
  const [description,     setDescription]     = useState('');
  const [cities,          setCities]          = useState('');
  const [phone,           setPhone]           = useState('');
  const [website,         setWebsite]         = useState('');

  /* ─ Queries ─ */
  const { data: agency, isLoading: agencyLoading } = useQuery({
    queryKey: ['my-agency'],
    queryFn: realtorApi.getMyAgency,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['my-agency-listings'],
    queryFn: realtorApi.getMyListings,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['my-agency-contracts'],
    queryFn: realtorApi.getMyContracts,
  });

  // Seed form when agency loads
  useEffect(() => {
    if (agency) {
      setAgencyName(agency.agencyName ?? '');
      setCuit(agency.cuit ?? '');
      setLicenseNumber(agency.licenseNumber ?? '');
      setLicenseAuth(agency.licenseAuthority ?? '');
      setLicenseExpiry(agency.licenseExpiry ? agency.licenseExpiry.slice(0, 10) : '');
      setDescription(agency.description ?? '');
      setCities((agency.cities ?? []).join(', '));
      setPhone(agency.phone ?? '');
      setWebsite(agency.website ?? '');
    } else if (!agencyLoading) {
      // New realtor — open editing immediately
      setEditing(true);
    }
  }, [agency, agencyLoading]);

  /* ─ Mutations ─ */
  const upsertMutation = useMutation({
    mutationFn: () => realtorApi.upsertMyAgency({
      agencyName,
      cuit:            cuit.replace(/\D/g, '') || undefined,
      licenseNumber:   licenseNumber || undefined,
      licenseAuthority: licenseAuth || undefined,
      licenseExpiry:   licenseExpiry || undefined,
      description:     description || undefined,
      cities:          cities.split(',').map(c => c.trim()).filter(Boolean),
      phone:           phone || undefined,
      website:         website || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-agency'] });
      setEditing(false);
    },
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al guardar'),
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => realtorApi.uploadLogo(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-agency'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error al subir logo'),
  });

  /* ─ Stats ─ */
  const activeContracts  = (contracts as any[]).filter((c: any) => c.status === 'ACTIVE').length;
  const publishedListings = (listings as any[]).filter((l: any) => l.listing?.isPublished).length;
  const monthlyRevenue   = (contracts as any[])
    .filter((c: any) => c.status === 'ACTIVE')
    .reduce((sum: number, c: any) => sum + Number(c.monthlyAmount), 0);

  /* ─── Render ─── */
  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── Welcome banner (solo primera vez) ─────────────────────────── */}
      {showWelcome && (
        <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <button onClick={() => setShowWelcome(false)} className="absolute top-4 right-4 text-white/70 hover:text-white text-xl">×</button>
          <div className="relative">
            <p className="text-2xl mb-1">🏛️ ¡Bienvenida a habitta!</p>
            <p className="text-sm opacity-90 max-w-sm">
              Tu cuenta de inmobiliaria está lista. Completá el perfil de la agencia para aparecer verificada en el marketplace.
            </p>
            <button onClick={() => { setShowWelcome(false); setEditing(true); }}
              className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-sm px-4 py-2 rounded-xl transition">
              Completar perfil →
            </button>
          </div>
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Logo / iniciales */}
          <div className="relative">
            <div
              onClick={() => !logoMutation.isPending && logoRef.current?.click()}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 border-2 border-purple-200 flex items-center justify-center text-2xl font-bold text-purple-600 cursor-pointer hover:border-purple-400 transition overflow-hidden"
            >
              {agency?.logoUrl
                ? <img src={`${process.env.NEXT_PUBLIC_API_URL}${agency.logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
                : (agency?.agencyName?.[0] ?? user?.firstName?.[0] ?? '🏛️')
              }
            </div>
            <button
              onClick={() => logoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-gray-200 shadow flex items-center justify-center text-xs hover:bg-gray-50"
              title="Cambiar logo"
            >
              {logoMutation.isPending ? '…' : '📷'}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) logoMutation.mutate(f); }}
            />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {agency?.agencyName ?? `${user?.firstName} ${user?.lastName}`}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {agency?.isVerified
                ? <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">✓ Verificada</span>
                : <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded-full">⏳ Pendiente verificación</span>
              }
              <span className="text-xs text-gray-400">Inmobiliaria · Plan REALTOR</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              ✏️ Editar perfil
            </button>
          )}
          <Link href="/listings/new" className="btn-primary text-sm">
            + Nueva propiedad
          </Link>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: publishedListings, label: 'Propiedades activas', icon: '🏘️' },
          { value: activeContracts,   label: 'Contratos vigentes',  icon: '📄' },
          { value: `$${monthlyRevenue.toLocaleString('es-AR')}`, label: 'Ingresos / mes', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Agency profile form / view ─────────────────────────────────── */}
      {agencyLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : editing ? (
        <Section icon="🏛️" title="Datos de la agencia">
          <div className="space-y-4">
            <Field label="Nombre de la agencia *">
              <input className="input" value={agencyName} onChange={e => setAgencyName(e.target.value)}
                placeholder="Inmobiliaria Del Valle S.A." />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CUIT" hint="11 dígitos. Se valida al confirmar.">
                <input className="input font-mono" value={cuit}
                  onChange={e => setCuit(formatCuit(e.target.value))}
                  placeholder="30-71234567-8" maxLength={13} />
              </Field>
              <Field label="Teléfono comercial">
                <input className="input" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+54 11 4000-1234" type="tel" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Matrícula" hint="Nº CUCICBA, CMCPSI, etc.">
                <input className="input font-mono" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)}
                  placeholder="Nº 5678" />
              </Field>
              <Field label="Organismo emisor">
                <input className="input" value={licenseAuth} onChange={e => setLicenseAuth(e.target.value)}
                  placeholder="CUCICBA, CMCPSI…" />
              </Field>
            </div>

            <Field label="Vencimiento de matrícula">
              <input className="input" type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)} />
            </Field>

            <Field label="Ciudades donde operan" hint="Separadas por coma. Ej: Buenos Aires, Palermo, Belgrano">
              <input className="input" value={cities} onChange={e => setCities(e.target.value)}
                placeholder="Buenos Aires, La Plata, Rosario" />
            </Field>

            <Field label="Descripción de la agencia">
              <textarea className="input min-h-[100px] resize-y" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Más de 20 años en el mercado. Especialistas en Palermo y Belgrano. Administramos más de 200 propiedades." />
            </Field>

            <Field label="Sitio web">
              <input className="input" value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="https://www.mimobiliaria.com.ar" type="url" />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {agency && (
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Cancelar</button>
              )}
              <button
                onClick={() => upsertMutation.mutate()}
                disabled={!agencyName.trim() || upsertMutation.isPending}
                className="btn-primary text-sm"
              >
                {upsertMutation.isPending ? <><LoadingSpinner /> Guardando…</> : 'Guardar perfil'}
              </button>
            </div>
          </div>
        </Section>
      ) : agency ? (
        <Section icon="🏛️" title="Perfil de la agencia">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Nombre', value: agency.agencyName },
              { label: 'CUIT', value: agency.cuit ? formatCuit(agency.cuit) : '—' },
              { label: 'Matrícula', value: agency.licenseNumber ?? '—' },
              { label: 'Organismo', value: agency.licenseAuthority ?? '—' },
              { label: 'Vencimiento', value: agency.licenseExpiry ? new Date(agency.licenseExpiry).toLocaleDateString('es-AR') : '—' },
              { label: 'Teléfono', value: agency.phone ?? '—' },
              { label: 'Ciudades', value: (agency.cities ?? []).join(', ') || '—' },
              { label: 'Web', value: agency.website ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-gray-800 font-medium">{value}</p>
              </div>
            ))}
            {agency.description && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Descripción</p>
                <p className="text-gray-700 leading-relaxed">{agency.description}</p>
              </div>
            )}
          </div>
        </Section>
      ) : null}

      {/* ── Propiedades ────────────────────────────────────────────────── */}
      <Section icon="🏘️" title="Mis propiedades">
        {listingsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (listings as any[]).length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-4xl">🏚️</p>
            <p className="text-gray-600 font-medium">Todavía no publicaste ninguna propiedad</p>
            <p className="text-sm text-gray-400">Publicá el primer inmueble que gestionás para tu cliente.</p>
            <Link href="/listings/new" className="btn-primary text-sm inline-flex">+ Publicar propiedad</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(listings as any[]).map((l: any) => <ListingCard key={l.id} listing={l} />)}
            <div className="pt-2">
              <Link href="/listings/new" className="text-sm text-indigo-600 hover:underline font-medium">
                + Publicar otra propiedad
              </Link>
            </div>
          </div>
        )}
      </Section>

      {/* ── Contratos ──────────────────────────────────────────────────── */}
      <Section icon="📄" title="Contratos vigentes">
        {contractsLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (contracts as any[]).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No tenés contratos aún. Se crean cuando firmás con un inquilino.</p>
            <Link href="/contracts" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">Ver contratos →</Link>
          </div>
        ) : (
          <div>
            {(contracts as any[]).slice(0, 8).map((c: any) => <ContractRow key={c.id} contract={c} />)}
            {(contracts as any[]).length > 8 && (
              <Link href="/contracts" className="text-sm text-indigo-600 hover:underline mt-3 inline-block">
                Ver todos ({(contracts as any[]).length}) →
              </Link>
            )}
          </div>
        )}
      </Section>

      {/* ── Si no hay perfil completo, warning ─────────────────────────── */}
      {!agency?.licenseNumber && agency && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-800">Completá tu matrícula</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Para aparecer como inmobiliaria verificada necesitás cargar tu número de matrícula (CUCICBA, CMCPSI u organismo provincial).
            </p>
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-amber-700 underline mt-1">
              Completar datos →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
