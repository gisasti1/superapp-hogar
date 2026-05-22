import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { kycApi, paymentsApi } from '../../lib/api';

export default function HomeScreen() {
  const user = useAuthStore(s => s.user);

  const { data: kycStatus } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: kycApi.getStatus,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
  });

  const isVerified = kycStatus?.status === 'VERIFIED';
  const pendingPayments = payments?.filter((p: any) => p.status === 'PENDING') ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>¡Hola, {user?.firstName}! 👋</Text>

      {!isVerified && (
        <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/kyc')}>
          <Text style={styles.alertTitle}>⚠️ Verificá tu identidad</Text>
          <Text style={styles.alertBody}>
            Completá el KYC para acceder a todas las funciones.
          </Text>
          <Text style={styles.alertCta}>Verificar ahora →</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Accesos rápidos</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.gridItem}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.gridIcon}>{action.icon}</Text>
            <Text style={styles.gridLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {pendingPayments.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pagos pendientes</Text>
          {pendingPayments.slice(0, 2).map((p: any) => (
            <View key={p.id} style={styles.paymentCard}>
              <Text style={styles.paymentAmount}>
                ${Number(p.amount).toLocaleString('es-AR')} {p.currency}
              </Text>
              <Text style={styles.paymentDue}>
                Vence: {new Date(p.dueDate).toLocaleDateString('es-AR')}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const QUICK_ACTIONS = [
  { icon: '🛡️', label: 'Seguro de\nCaución', route: '/(tabs)/contracts' },
  { icon: '✍️', label: 'Contrato\nDigital', route: '/(tabs)/contracts' },
  { icon: '💰', label: 'Pagos\nMensuales', route: '/(tabs)/payments' },
  { icon: '⭐', label: 'Mediación\nIA', route: '/(tabs)/mediation' },
  { icon: '🏠', label: 'Buscar\nInmueble', route: '/listings' },
  { icon: '🔧', label: 'Servicios\nHogar', route: '/services' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  alertCard: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 12, padding: 16, marginBottom: 24 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginBottom: 4 },
  alertBody: { fontSize: 13, color: '#78350f', marginBottom: 8 },
  alertCta: { fontSize: 13, fontWeight: '600', color: '#d97706' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  gridItem: { width: '30%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  gridIcon: { fontSize: 28, marginBottom: 8 },
  gridLabel: { fontSize: 12, color: '#374151', textAlign: 'center', fontWeight: '500' },
  paymentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentAmount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  paymentDue: { fontSize: 13, color: '#6b7280' },
});
