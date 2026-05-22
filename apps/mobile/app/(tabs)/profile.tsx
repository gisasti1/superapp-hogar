import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../lib/api';

const KYC_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  VERIFIED: '✅ Verificado',
  REJECTED: '❌ Rechazado',
};

export default function ProfileScreen() {
  const { user, clearAuth } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const data = profile ?? user;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {data?.firstName?.[0]}{data?.lastName?.[0]}
        </Text>
      </View>

      <Text style={styles.name}>{data?.firstName} {data?.lastName}</Text>
      <Text style={styles.email}>{data?.email}</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {data?.role === 'TENANT' ? 'Inquilino' : data?.role === 'LANDLORD' ? 'Propietario' : data?.role}
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="Identidad" value={KYC_LABELS[profile?.verification?.status ?? 'PENDING']} />
        <Row label="Plan" value={profile?.subscription?.plan ?? 'FREE'} />
        <Row label="Email" value={data?.email ?? ''} />
        {data?.phone && <Row label="Teléfono" value={data.phone} />}
      </View>

      <TouchableOpacity style={styles.kycBtn} onPress={() => router.push('/kyc' as any)}>
        <Text style={styles.kycBtnText}>Verificar identidad (KYC)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  badge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 24 },
  badgeText: { color: '#1a56db', fontWeight: '600', fontSize: 13 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  kycBtn: { width: '100%', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#1a56db', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  kycBtnText: { color: '#1a56db', fontWeight: '600' },
  logoutBtn: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '600' },
});
