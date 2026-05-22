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
import { contractsApi } from '../../lib/api';
import { ContractStatus } from '@superapp/shared';
import { useAuthStore } from '../../stores/auth.store';

const STATUS_LABEL: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Borrador',
  [ContractStatus.PENDING_SIGNATURES]: 'Esperando firmas',
  [ContractStatus.SIGNED]: 'Firmado',
  [ContractStatus.ACTIVE]: 'Activo',
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

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id!),
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: () => contractsApi.sign(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] });
      Alert.alert('Firmado', 'El contrato fue firmado digitalmente.');
    },
    onError: () => Alert.alert('Error', 'No se pudo firmar el contrato.'),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1a56db" />
      </View>
    );
  }

  if (!contract) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No se encontró el contrato.</Text>
      </View>
    );
  }

  const status = contract.status as ContractStatus;
  const userSigned =
    contract.signatures?.some((s: any) => s.userId === user?.id) ?? false;
  const signatures = contract.signatures ?? [];
  const landlordSigned = signatures.some((s: any) => s.role === 'landlord');
  const tenantSigned = signatures.some((s: any) => s.role === 'tenant');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.address} numberOfLines={2}>
          {contract.property?.address ?? 'Inmueble'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      {/* Datos principales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos del contrato</Text>
        <Row label="Alquiler mensual" value={`${contract.currency} ${Number(contract.monthlyAmount).toLocaleString('es-AR')}`} />
        <Row label="Depósito" value={`${contract.currency} ${Number(contract.depositAmount).toLocaleString('es-AR')}`} />
        <Row label="Inicio" value={new Date(contract.startDate).toLocaleDateString('es-AR')} />
        <Row label="Fin" value={new Date(contract.endDate).toLocaleDateString('es-AR')} />
        {contract.signedAt && (
          <Row label="Firmado el" value={new Date(contract.signedAt).toLocaleDateString('es-AR')} />
        )}
      </View>

      {/* Firmas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Firmas</Text>
        <SignatureRow
          label="Propietario"
          signed={landlordSigned}
          signerEmail={contract.landlord?.email}
        />
        <SignatureRow
          label="Inquilino"
          signed={tenantSigned}
          signerEmail={contract.tenant?.email}
        />
      </View>

      {/* Botón firmar */}
      {!userSigned &&
        (status === ContractStatus.PENDING_SIGNATURES || status === ContractStatus.DRAFT) && (
          <TouchableOpacity
            style={[styles.signBtn, signMutation.isPending && styles.btnDisabled]}
            onPress={() =>
              Alert.alert('Firmar contrato', '¿Confirmás la firma digital?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Firmar', onPress: () => signMutation.mutate() },
              ])
            }
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signBtnText}>✍️ Firmar digitalmente</Text>
            )}
          </TouchableOpacity>
        )}

      {/* PDF */}
      {contract.pdfUrl && (
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => Linking.openURL(contract.pdfUrl)}
        >
          <Text style={styles.pdfBtnText}>📄 Descargar PDF</Text>
        </TouchableOpacity>
      )}

      {/* Póliza asociada */}
      {contract.policy && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ Seguro de caución</Text>
          <Row label="Aseguradora" value={contract.policy.providerName ?? '—'} />
          <Row label="N° de póliza" value={contract.policy.policyNumber ?? '—'} />
          <Row label="Estado" value={contract.policy.status ?? '—'} />
          <Row
            label="Cobertura"
            value={`${contract.currency} ${Number(contract.policy.coverageAmount ?? 0).toLocaleString('es-AR')}`}
          />
        </View>
      )}

      {/* Depósito en garantía */}
      {contract.deposit && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒 Depósito en garantía</Text>
          <Row
            label="Saldo"
            value={`${contract.currency} ${Number(contract.deposit.balance ?? 0).toLocaleString('es-AR')}`}
          />
          <Row label="Estado" value={contract.deposit.status ?? '—'} />
        </View>
      )}
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

function SignatureRow({
  label,
  signed,
  signerEmail,
}: {
  label: string;
  signed: boolean;
  signerEmail?: string;
}) {
  return (
    <View style={styles.signatureRow}>
      <View>
        <Text style={styles.signatureLabel}>{label}</Text>
        {signerEmail && <Text style={styles.signatureEmail}>{signerEmail}</Text>}
      </View>
      <Text style={signed ? styles.signedBadge : styles.pendingBadge}>
        {signed ? '✅ Firmado' : '⏳ Pendiente'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },

  header: { marginBottom: 20 },
  address: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontWeight: '700', fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  signatureLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  signatureEmail: { fontSize: 12, color: '#9ca3af' },
  signedBadge: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  pendingBadge: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },

  signBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  signBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  pdfBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  pdfBtnText: { color: '#1a56db', fontSize: 15, fontWeight: '600' },
});
