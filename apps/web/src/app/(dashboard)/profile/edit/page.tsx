'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const EMPLOYMENT_TYPES = [
  { id: 'EMPLOYEE', label: 'Empleado (relación de dependencia)' },
  { id: 'SELF_EMPLOYED', label: 'Monotributista / autónomo' },
  { id: 'FREELANCER', label: 'Freelancer' },
  { id: 'BUSINESS_OWNER', label: 'Empresario / dueño de negocio' },
  { id: 'STUDENT', label: 'Estudiante' },
  { id: 'RETIRED', label: 'Jubilado / pensionado' },
  { id: 'UNEMPLOYED', label: 'Desempleado' },
  { id: 'OTHER', label: 'Otro' },
];

const MARITAL_STATUSES = [
  { id: 'SINGLE', label: 'Soltero/a' },
  { id: 'IN_RELATIONSHIP', label: 'En pareja' },
  { id: 'MARRIED', label: 'Casado/a' },
  { id: 'DIVORCED', label: 'Divorciado/a' },
  { id: 'WIDOWED', label: 'Viudo/a' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decir' },
];

export default function ProfileEditPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  // Prellenar el form con los datos actuales
  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        province: profile.province ?? '',
        dni: profile.dni ?? '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : '',
        nationality: profile.nationality ?? '',
        occupation: profile.occupation ?? '',
        employmentType: profile.employmentType ?? '',
        employer: profile.employer ?? '',
        monthlyIncome: profile.monthlyIncome ? Number(profile.monthlyIncome) : '',
        maritalStatus: profile.maritalStatus ?? '',
        hasPets: profile.hasPets ?? false,
        smoker: profile.smoker ?? false,
        bio: profile.bio ?? '',
        emergencyContactName: profile.emergencyContactName ?? '',
        emergencyContactPhone: profile.emergencyContactPhone ?? '',
      });
    }
  }, [profile]);

  const { mutate: save, isPending, error } = useMutation({
    mutationFn: () => {
      // Limpiar strings vacíos a undefined para no overrideear con vacío
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === 'boolean') payload[k] = v;
        else if (typeof v === 'number') payload[k] = v;
        else if (typeof v === 'string' && v.trim()) payload[k] = v.trim();
      }
      if (payload.monthlyIncome === '' || payload.monthlyIncome === undefined) delete payload.monthlyIncome;
      else payload.monthlyIncome = Number(payload.monthlyIncome);
      return authApi.updateProfile(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    setForm(f => ({
      ...f,
      [k]: target.type === 'checkbox' ? target.checked : target.value,
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const errMsg = (error as any)?.response?.data?.message;
  const errStr = Array.isArray(errMsg) ? errMsg.join(' · ') : errMsg;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">← Volver al perfil</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Completá tu perfil</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cuanta más información tengas, más fácil que un propietario te elija o que conozcas a la persona que te va a alquilar.
        </p>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); save(); }}
        className="space-y-6"
      >
        {errStr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {errStr}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
            ✓ Cambios guardados
          </div>
        )}

        {/* ─── Datos básicos ─── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Datos básicos</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.firstName ?? ''} onChange={handleChange('firstName')} />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={form.lastName ?? ''} onChange={handleChange('lastName')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" className="input" value={form.phone ?? ''} onChange={handleChange('phone')} />
            </div>
            <div>
              <label className="label">DNI</label>
              <input className="input" value={form.dni ?? ''} onChange={handleChange('dni')} placeholder="32123456" />
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" value={form.address ?? ''} onChange={handleChange('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ciudad</label>
              <input className="input" value={form.city ?? ''} onChange={handleChange('city')} />
            </div>
            <div>
              <label className="label">Provincia</label>
              <input className="input" value={form.province ?? ''} onChange={handleChange('province')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input type="date" className="input" value={form.dateOfBirth ?? ''} onChange={handleChange('dateOfBirth')} />
            </div>
            <div>
              <label className="label">Nacionalidad</label>
              <input className="input" value={form.nationality ?? ''} onChange={handleChange('nationality')} />
            </div>
          </div>
        </div>

        {/* ─── Datos profesionales ─── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Trabajo e ingresos</h2>
          <p className="text-xs text-gray-500 -mt-2">
            Estos datos ayudan al propietario a evaluar si podés afrontar el alquiler. Vos decidís cuáles cargás.
          </p>
          <div>
            <label className="label">Ocupación / profesión</label>
            <input className="input" value={form.occupation ?? ''} onChange={handleChange('occupation')} placeholder="Programadora, Médico, Comerciante..." />
          </div>
          <div>
            <label className="label">Tipo de empleo</label>
            <select className="input" value={form.employmentType ?? ''} onChange={handleChange('employmentType')}>
              <option value="">Sin especificar</option>
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Empresa / empleador</label>
            <input className="input" value={form.employer ?? ''} onChange={handleChange('employer')} placeholder="Telecom Argentina" />
          </div>
          <div>
            <label className="label">Ingresos mensuales (ARS)</label>
            <input type="number" min="0" className="input" value={form.monthlyIncome ?? ''} onChange={handleChange('monthlyIncome')} placeholder="850000" />
            <p className="text-xs text-gray-400 mt-1">Solo se muestra al propietario al solicitar alquiler. Acelera la aprobación.</p>
          </div>
        </div>

        {/* ─── Estilo de vida ─── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Estilo de vida</h2>
          <div>
            <label className="label">Estado civil</label>
            <select className="input" value={form.maritalStatus ?? ''} onChange={handleChange('maritalStatus')}>
              <option value="">Sin especificar</option>
              {MARITAL_STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.hasPets} onChange={handleChange('hasPets')} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-gray-700">🐾 Tengo mascota(s)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.smoker} onChange={handleChange('smoker')} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm text-gray-700">🚬 Fumo</span>
            </label>
          </div>
          <div>
            <label className="label">Sobre mí</label>
            <textarea
              className="input min-h-[100px]"
              value={form.bio ?? ''}
              onChange={handleChange('bio')}
              maxLength={2000}
              placeholder="Contate brevemente: a qué te dedicás, qué hacés en tu tiempo libre, qué buscás en un hogar..."
            />
            <p className="text-xs text-gray-400 mt-1">{(form.bio ?? '').length}/2000 caracteres</p>
          </div>
        </div>

        {/* ─── Contacto de emergencia ─── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Contacto de emergencia</h2>
          <p className="text-xs text-gray-500 -mt-2">
            Una persona a quien podamos avisar en caso de emergencia. No se usa para nada más.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" value={form.emergencyContactName ?? ''} onChange={handleChange('emergencyContactName')} placeholder="María Pérez" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" className="input" value={form.emergencyContactPhone ?? ''} onChange={handleChange('emergencyContactPhone')} placeholder="+5491155667788" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sticky bottom-2 bg-white p-3 rounded-xl shadow-lg border border-gray-100">
          <button type="submit" disabled={isPending} className="btn-primary flex-1">
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button type="button" onClick={() => router.push('/profile')} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
