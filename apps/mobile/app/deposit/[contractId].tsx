import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositsApi } from '../../lib/api';

type DepositStatus = 'HELD' | 'RELEASED' | 'DISPUTED';

const STATUS_CONFIG: Record<DepositStatus, { label: string; icon: string; color: string; bg: string }> = {
  HELD: { label: 'Retenido', icon: '🔒', color: '#92400e', bg: '#fffbeb' },
  RELEASED: { label: 'Liberado', icon: '✅', color: '#065f46', bg: '#ecfdf5' },
  DISPUTED: { label: 'En disputa', icon: '⚠️', color: '#7c3aed', bg: '#f5f3ff' },
};

export default function DepositScreen() {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const qc = useQueryClient();

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ['deposit-balance', contractId],
    queryFn: () => depositsApi.getBalance(contractId!),
    enabled: !!contractId,
  });

  const { data: ledger, isLoading: loadingLedger } = useQuery({
    queryKey: ['deposit-ledger', contractId],
    queryFn: () => depositsApi.getLedger(contractId!),
    enabled: !!contractId,
  });

  const depositMutation = useMutation({
    mutationFn: () => depositsApi.deposit(contractId!),
    onSuccess: async (result) => {
      const url = result.initPoint ?? result.url ?? result.checkoutUrl;
      if (url) {
        await Linking.openURL(url);
      }
      qc.invalidateQueries({ queryKey: ['deposit-balance', contractId] });
    },
    onError: () => Alert.alert('Error', 'No se pudo iniciar el depósito.'),
  });

  const releaseMutation = useMutation({
    mutationFn: () => depositsApi.requestRelease(contractId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposit-balance', contractId] });
      Alert.alert('Solicitud enviada', 'La solicitud de liberación fue enviada correctamente.');
    },
    onError: () => Alert.alert('Error', 'No se pudo solicitar la liberación.'),
  });

  const depositStatus = (balance?.status as DepositStatus) ?? 'HELD';
  const config = STATUS_CONFIG[depositStatus] ?? STATUS_CONFIG.HELD;

  if (loadingBalance) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1a56db" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Depósito en garantía</Text>

      {/* Badge de estado */}
      <View style={[styles.statusCard, { backgroundColor: config.bg }]}>
        <Text style={styles.statusIcon}>{config.icon}</Text>
        <View>
          <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.statusSub}>Estado actual del depósito</Text>
        </View>
      </View>

      {/* Saldo y rendimiento */}
      {balance && (
        <View style={styles.balanceCard}>
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>Saldo actual</Text>
            <Text style={styles.balanceValue}>
              {balance.currency ?? 'ARS'}{' '}
              {Number(balance.balance ?? 0).toLocaleString('es-AR')}
            </Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.balanceBlock}>
            <Text style={styles.balanceLabel}>Rendimiento</Text>
            <Text style={[styles.balanceValue, styles.yieldValue]}>
              +{balance.currency ?? 'ARS'}{' '}
              {Number(balance.yield ?? 0).toLocaleString('es-AR')}
            </Text>
          </View>
        </View>
      )}

      {/* Botones de acción */}
      {!balance || balance.balance === 0 ? (
        <TouchableOpacity
          style={[styles.primaryBtn, depositMutation.isPending && styles.btnDisabled]}
          onPress={() => depositMutation.mutate()}
          disabled={depositMutation.isPending}
        >
          {depositMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>💳 Depositar fianza</Text>
          )}
        </TouchableOpacity>
      ) : (
        depositStatus === 'HELD' && (
          <TouchableOpacity
            style={[styles.releaseBtn, releaseMutation.isPending && styles.btnDisabled]}
            onPress={() =>
              Alert.alert(
                'Solicitar liberación',
                '¿Querés solicitar la liberación del depósito?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Solicitar', onPress: () => releaseMutation.mutate() },
                ],
              )
            }
            disabled={releaseMutation.isPending}
          >
            {releaseMutation.isPending ? (
              <ActivityIndicator color="#1a56db" />
            ) : (
              <Text style={styles.releaseBtnText}>Solicitar liberación</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Historial */}
      <Text style={styles.sectionTitle}>Historial de movimientos</Text>
      {loadingLedger ? (
        <ActivityIndicator color="#1a56db" />
      ) : !ledger?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Sin movimientos aún</Text>
        </View>
      ) : (
        ledger.map((entry: any, i: number) => (
          <View key={entry.id ?? i} style={styles.ledgerRow}>
            <View style={styles.ledgerLeft}>
              <Text style={styles.ledgerType}>
                {entry.type === 'CREDIT' ? '⬆️' : '⬇️'} {entry.description ?? entry.type}
              </Text>
              <Text style={styles.ledgerDate}>
                {new Date(entry.createdAt).toLocaleDateString('es-AR')}
              </Text>
            </View>
            <Text
              style={[
                styles.ledgerAmount,
                entry.type === 'CREDIT' ? styles.creditAmount : styles.debitAmount,
              ]}
            >
              {entry.type === 'CREDIT' ? '+' : '-'}
              {entry.currency ?? 'ARS'} {Number(entry.amount).toLocaleString('es-AR')}
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

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 16, marginBottom: 16 },
  statusIcon: { fontSize: 32 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  balanceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, flexDirection: 'row', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  balanceBlock: { flex: 1, alignItems: 'center' },
  dividerV: { width: 1, backgroundColor: '#f3f4f6', marginHorizontal: 12 },
  balanceLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },
  balanceValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  yieldValue: { color: '#10b981' },

  primaryBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  releaseBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  releaseBtnText: { color: '#1a56db', fontSize: 15, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  ledgerRow: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  ledgerLeft: {},
  ledgerType: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
  ledgerDate: { fontSize: 12, color: '#9ca3af' },
  ledgerAmount: { fontSize: 15, fontWeight: '700' },
  creditAmount: { color: '#10b981' },
  debitAmount: { color: '#ef4444' },
});
