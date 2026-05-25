'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ROLES = ['', 'TENANT', 'LANDLORD', 'PROVIDER', 'REALTOR', 'ADMIN'];

const ROLE_LABELS: Record<string, string> = {
  TENANT: 'Inquilino', LANDLORD: 'Propietario', PROVIDER: 'Prestador',
  REALTOR: 'Inmobiliaria', ADMIN: 'Admin',
};

export default function AdminUsersPage() {
  const me = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search, role],
    queryFn: () => adminApi.listUsers({ search: search || undefined, role: role || undefined }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.setUserActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Error'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">Gestionar cuentas del sistema</p>
      </div>

      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Buscar por email, nombre, apellido..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-48"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          {ROLES.map(r => (
            <option key={r || 'all'} value={r}>{r ? ROLE_LABELS[r] ?? r : 'Todos los roles'}</option>
          ))}
        </select>
      </div>

      {/* Tabla / lista */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : users.length === 0 ? (
        <div className="card text-center text-gray-500 py-8">Sin resultados</div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">KYC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: any) => {
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} className={isMe ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">
                        {u.firstName} {u.lastName}
                        {isMe && <span className="text-xs text-blue-600 ml-2">(vos)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.phone && <p className="text-[10px] text-gray-400">{u.phone}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <select
                        value={u.role}
                        disabled={isMe}
                        onChange={e => {
                          if (confirm(`Cambiar rol de ${u.firstName} a ${e.target.value}?`)) {
                            changeRoleMutation.mutate({ id: u.id, role: e.target.value });
                          }
                        }}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
                      >
                        {ROLES.filter(r => r).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">
                      <span className={u.verification?.status === 'VERIFIED' ? 'text-green-600' : 'text-gray-400'}>
                        {u.verification?.status === 'VERIFIED' ? '✓ Verificado' : 'Sin verificar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <button
                          disabled={isMe}
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          className={`text-xs px-2 py-1 rounded ${
                            u.isActive
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-30`}
                        >
                          {u.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          disabled={isMe}
                          onClick={() => {
                            if (confirm(`¿Eliminar a ${u.firstName} ${u.lastName}? Esto es irreversible.\nNo se puede si tiene contratos activos.`)) {
                              deleteMutation.mutate(u.id);
                            }
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-30"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
