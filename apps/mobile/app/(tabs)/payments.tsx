import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../../lib/api';
import { PaymentStatus, PaymentType } from '@superapp/shared';

const TYPE_LABEL: Record<string, string> = {
  [PaymentType.RENT]: 'Alquiler',
  [PaymentType.INSURANCE_PREMIUM]: 'Prima de seguro',
  [PaymentType.DEPOSIT]: 'Depósito en garantía',
  [PaymentType.SERVICE]: 'Servicio del hogar',
  [PaymentType.SUBSCRIPTION]: 'Suscripción Premium',
};

export default function PaymentsScreen() {
  const qc = useQueryClient();
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.list,
  });

  const { mutate: pay, isPending } = useMutation({
    mutationFn: (id: string) => paymentsApi.pay(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      Alert.alert('✅ Pago iniciado', 'Serás redirigido al medio de pago.');
    },
    onError: () => Alert.alert('Error', 'No se pudo procesar el pago.'),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  const pending = payments?.filter((p: any) => p.status === PaymentStatus.PENDING) ?? [];
  const history = payments?.filter((p: any) => p.status !== PaymentStatus.PENDING) ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pagos</Text>

      {pending.length > 0 && (
        <>
          <Text style={styles.section}>Pendientes</Text>
          {pending.map((p: any) => (
            <View key={p.id} style={[styles.card, styles.pendingCard]}>
              <View style={styles.row}>
                <Text style={styles.type}>{TYPE_LABEL[p.type] ?? p.type}</Text>
                <Text style={styles.amount}>
                  ${Number(p.amount).toLocaleString('es-AR')} {p.currency}
                </Text>
              </View>
              <Text style={styles.due}>
                Vence: {new Date(p.dueDate).toLocaleDateString('es-AR')}
              </Text>
              <TouchableOpacity
                style={[styles.payBtn, isPending && styles.payBtnDisabled]}
                onPress={() => pay(p.id)}
                disabled={isPending}
              >
                <Text style={styles.payBtnText}>Pagar ahora</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <Text style={styles.section}>Historial</Text>
          {history.map((p: any) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.type}>{TYPE_LABEL[p.type] ?? p.type}</Text>
                <Text style={styles.amount}>
                  ${Number(p.amount).toLocaleString('es-AR')}
                </Text>
              </View>
              <Text style={styles.due}>
                {p.paidAt
                  ? `Pagado: ${new Date(p.paidAt).toLocaleDateString('es-AR')}`
                  : p.status}
              </Text>
            </View>
          ))}
        </>
      )}

      {!payments?.length && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>Sin pagos todavía</Text>
          <Text style={styles.emptyBody}>
            Tus pagos de alquiler y servicios aparecerán acá.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  section: { fontSize: 14, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  pendingCard: { borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  type: { fontSize: 14, fontWeight: '600', color: '#374151' },
  amount: { fontSize: 16, fontWeight: '700', color: '#111827' },
  due: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  payBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 12, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
