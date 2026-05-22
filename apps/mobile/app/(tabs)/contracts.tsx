import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { contractsApi } from '../../lib/api';
import { ContractStatus } from '@superapp/shared';

const STATUS_LABEL: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Borrador',
  [ContractStatus.PENDING_SIGNATURES]: 'Esperando firmas',
  [ContractStatus.SIGNED]: 'Firmado',
  [ContractStatus.ACTIVE]: '✅ Activo',
  [ContractStatus.TERMINATED]: 'Rescindido',
  [ContractStatus.EXPIRED]: 'Vencido',
};

const STATUS_COLOR: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: '#9ca3af',
  [ContractStatus.PENDING_SIGNATURES]: '#f59e0b',
  [ContractStatus.SIGNED]: '#3b82f6',
  [ContractStatus.ACTIVE]: '#10b981',
  [ContractStatus.TERMINATED]: '#ef4444',
  [ContractStatus.EXPIRED]: '#6b7280',
};

export default function ContractsScreen() {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.list,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mis contratos</Text>

      {!contracts?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>Sin contratos aún</Text>
          <Text style={styles.emptyBody}>
            Cuando tengas un contrato de locación activo aparecerá acá.
          </Text>
        </View>
      ) : (
        contracts.map((c: any) => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.address} numberOfLines={1}>
                {c.property?.address ?? 'Inmueble'}
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[c.status as ContractStatus] }]}>
                {STATUS_LABEL[c.status as ContractStatus]}
              </Text>
            </View>
            <Text style={styles.detail}>
              ${Number(c.monthlyAmount).toLocaleString('es-AR')} {c.currency}/mes
            </Text>
            <Text style={styles.detail}>
              {new Date(c.startDate).toLocaleDateString('es-AR')} →{' '}
              {new Date(c.endDate).toLocaleDateString('es-AR')}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  address: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  status: { fontSize: 13, fontWeight: '600' },
  detail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
