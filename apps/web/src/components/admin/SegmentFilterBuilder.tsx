'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketingApi } from '@/lib/api';

/** Coincide con SegmentFilters del backend (apps/api/.../segment-filters.ts). */
export interface SegmentFilters {
  role?: string;
  city?: string;
  province?: string;
  nationality?: string;
  ageMin?: number;
  ageMax?: number;
  occupation?: string;
  employmentType?: string;
  minIncome?: number;
  maxIncome?: number;
  maritalStatus?: string;
  hasPets?: boolean;
  smoker?: boolean;
  emailConsent?: boolean;
  smsConsent?: boolean;
  verified?: boolean;
  subscription?: string;
}

const ROLES = ['', 'TENANT', 'LANDLORD', 'PROVIDER', 'REALTOR', 'ADMIN'];
const EMPLOYMENT_TYPES = ['', 'EMPLOYEE', 'SELF_EMPLOYED', 'FREELANCER', 'BUSINESS_OWNER', 'STUDENT', 'RETIRED', 'UNEMPLOYED', 'OTHER'];
const MARITAL_STATUSES = ['', 'SINGLE', 'IN_RELATIONSHIP', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY'];
const SUBSCRIPTIONS = ['', 'FREE', 'PREMIUM', 'REALTOR'];

/** Convierte el form (todo strings) al shape de SegmentFilters limpio. */
function normalize(f: Record<string, any>): SegmentFilters {
  const out: SegmentFilters = {};
  if (f.role) out.role = f.role;
  if (f.city?.trim()) out.city = f.city.trim();
  if (f.province?.trim()) out.province = f.province.trim();
  if (f.nationality?.trim()) out.nationality = f.nationality.trim();
  if (f.ageMin) out.ageMin = Number(f.ageMin);
  if (f.ageMax) out.ageMax = Number(f.ageMax);
  if (f.occupation?.trim()) out.occupation = f.occupation.trim();
  if (f.employmentType) out.employmentType = f.employmentType;
  if (f.minIncome) out.minIncome = Number(f.minIncome);
  if (f.maxIncome) out.maxIncome = Number(f.maxIncome);
  if (f.maritalStatus) out.maritalStatus = f.maritalStatus;
  // tristate: '' = no filtrar, 'true'/'false' = filtrar
  if (f.hasPets === 'true') out.hasPets = true;
  if (f.hasPets === 'false') out.hasPets = false;
  if (f.smoker === 'true') out.smoker = true;
  if (f.smoker === 'false') out.smoker = false;
  if (f.emailConsent === 'true') out.emailConsent = true;
  if (f.emailConsent === 'false') out.emailConsent = false;
  if (f.smsConsent === 'true') out.smsConsent = true;
  if (f.smsConsent === 'false') out.smsConsent = false;
  if (f.verified === 'true') out.verified = true;
  if (f.verified === 'false') out.verified = false;
  if (f.subscription) out.subscription = f.subscription;
  return out;
}

/** Inverso: convierte SegmentFilters a un form (para hidratar al editar). */
function denormalize(f: SegmentFilters): Record<string, any> {
  return {
    role: f.role ?? '',
    city: f.city ?? '',
    province: f.province ?? '',
    nationality: f.nationality ?? '',
    ageMin: f.ageMin ?? '',
    ageMax: f.ageMax ?? '',
    occupation: f.occupation ?? '',
    employmentType: f.employmentType ?? '',
    minIncome: f.minIncome ?? '',
    maxIncome: f.maxIncome ?? '',
    maritalStatus: f.maritalStatus ?? '',
    hasPets: f.hasPets === undefined ? '' : String(f.hasPets),
    smoker: f.smoker === undefined ? '' : String(f.smoker),
    emailConsent: f.emailConsent === undefined ? '' : String(f.emailConsent),
    smsConsent: f.smsConsent === undefined ? '' : String(f.smsConsent),
    verified: f.verified === undefined ? '' : String(f.verified),
    subscription: f.subscription ?? '',
  };
}

/**
 * Editor de filtros con preview en vivo del count.
 * Llama onChange cuando los filtros cambian para que el padre pueda guardarlos.
 */
export function SegmentFilterBuilder({
  initial,
  onChange,
}: {
  initial?: SegmentFilters;
  onChange: (filters: SegmentFilters) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => denormalize(initial ?? {}));

  // Si initial cambia (al cargar async), rehidratamos.
  useEffect(() => {
    if (initial) setForm(denormalize(initial));
  }, [initial]);

  const filters = useMemo(() => normalize(form), [form]);

  useEffect(() => {
    onChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Debounce manual: el preview se dispara después de 400ms sin cambios.
  const [debounced, setDebounced] = useState(filters);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 400);
    return () => clearTimeout(t);
  }, [JSON.stringify(filters)]);

  const { data: preview, isFetching } = useQuery({
    queryKey: ['segment-preview', debounced],
    queryFn: () => marketingApi.previewSegment(debounced),
    staleTime: 30_000,
  });

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="space-y-6">
      {/* Preview en vivo */}
      <div className="card bg-habitta-sand border-habitta-olive/30 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-habitta-earth font-semibold">
              Usuarios que coinciden
            </p>
            <p className="text-3xl font-bold text-habitta-deep mt-1 tabular-nums">
              {isFetching ? '…' : (preview?.count ?? 0).toLocaleString('es-AR')}
            </p>
            <p className="text-xs text-habitta-earth mt-0.5">
              {activeFiltersCount === 0
                ? 'Sin filtros = todos los usuarios activos'
                : `${activeFiltersCount} filtro${activeFiltersCount === 1 ? '' : 's'} aplicado${activeFiltersCount === 1 ? '' : 's'}`}
            </p>
          </div>
          {isFetching && (
            <span className="text-xs text-habitta-earth">Calculando...</span>
          )}
        </div>
      </div>

      {/* Demografía */}
      <Section title="🌎 Demografía">
        <Grid>
          <SelectField label="Rol" value={form.role} onChange={upd('role')} options={ROLES} placeholder="Todos los roles" />
          <TextField label="Ciudad (contiene)" value={form.city} onChange={upd('city')} placeholder="Buenos Aires" />
          <TextField label="Provincia (contiene)" value={form.province} onChange={upd('province')} placeholder="Buenos Aires" />
          <TextField label="Nacionalidad (contiene)" value={form.nationality} onChange={upd('nationality')} placeholder="Argentina" />
          <NumField label="Edad mínima" value={form.ageMin} onChange={upd('ageMin')} placeholder="18" />
          <NumField label="Edad máxima" value={form.ageMax} onChange={upd('ageMax')} placeholder="65" />
        </Grid>
      </Section>

      {/* Profesional */}
      <Section title="💼 Trabajo e ingresos">
        <Grid>
          <TextField label="Ocupación (contiene)" value={form.occupation} onChange={upd('occupation')} placeholder="Programador" />
          <SelectField label="Tipo de empleo" value={form.employmentType} onChange={upd('employmentType')} options={EMPLOYMENT_TYPES} placeholder="Todos" />
          <NumField label="Ingresos mínimos (ARS)" value={form.minIncome} onChange={upd('minIncome')} placeholder="500000" />
          <NumField label="Ingresos máximos (ARS)" value={form.maxIncome} onChange={upd('maxIncome')} placeholder="2000000" />
        </Grid>
      </Section>

      {/* Estilo de vida */}
      <Section title="🏠 Estilo de vida">
        <Grid>
          <SelectField label="Estado civil" value={form.maritalStatus} onChange={upd('maritalStatus')} options={MARITAL_STATUSES} placeholder="Cualquiera" />
          <TristateField label="Tiene mascotas" value={form.hasPets} onChange={upd('hasPets')} />
          <TristateField label="Fuma" value={form.smoker} onChange={upd('smoker')} />
        </Grid>
      </Section>

      {/* Compliance */}
      <Section title="✅ Consentimientos (Ley AR 25.326)">
        <Grid>
          <TristateField label="Consentió email marketing" value={form.emailConsent} onChange={upd('emailConsent')} />
          <TristateField label="Consentió SMS marketing" value={form.smsConsent} onChange={upd('smsConsent')} />
        </Grid>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-3">
          ⚠️ Para mandar campañas de email/SMS, filtrá por el consentimiento correspondiente —
          mandar a quien no consintió es <strong>infracción</strong>.
        </p>
      </Section>

      {/* Estado */}
      <Section title="🪪 Estado de la cuenta">
        <Grid>
          <TristateField label="KYC verificado" value={form.verified} onChange={upd('verified')} />
          <SelectField label="Suscripción" value={form.subscription} onChange={upd('subscription')} options={SUBSCRIPTIONS} placeholder="Cualquiera" />
        </Grid>
      </Section>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-3">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function NumField({ label, value, onChange, placeholder }: { label: string; value: string | number; onChange: any; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" min={0} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder,
}: { label: string; value: string; onChange: any; options: string[]; placeholder: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={onChange}>
        {options.map(o => (
          <option key={o} value={o}>{o === '' ? placeholder : o}</option>
        ))}
      </select>
    </div>
  );
}

/** Para booleanos: '' = no filtrar, 'true' = filtra true, 'false' = filtra false. */
function TristateField({ label, value, onChange }: { label: string; value: string; onChange: any }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={onChange}>
        <option value="">No filtrar</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}
