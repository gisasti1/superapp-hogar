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
import { useState } from 'react';
import { insuranceApi } from '../../lib/api';
import { QuoteOption } from '@superapp/shared';

export default function InsuranceCheckoutScreen() {
  const { policyId, quoteJson } = useLocalSearchParams<{
    policyId: string;
    quoteJson: string;
  }>();

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  let quote: Partial<QuoteOption> = {};
  try {
    quote = JSON.parse(quoteJson ?? '{}');
  } catch {
    // ignore
  }

  const handlePay = async () => {
    if (!policyId) {
      Alert.alert('Error', 'No se encontró la póliza seleccionada.');
      return;
    }
    setPaying(true);
    try {
      const result = await insuranceApi.payPolicy(policyId, '');
      const url = result.initPoint ?? result.url ?? result.checkoutUrl;
      if (url) {
        await Linking.openURL(url);
        setPaid(true);
      } else {
        setPaid(true);
      }
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el pago. Intentá de nuevo.');
    } finally {
      setPaying(false);
    }
  };

  if (paid) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>¡Póliza emitida!</Text>
        <Text style={styles.successBody}>
          Tu póliza de seguro de caución fue emitida correctamente. Recibirás el documento por email.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Confirmar póliza</Text>
      <Text style={styles.subtitle}>Revisá el resumen antes de pagar.</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionLabel}>Aseguradora</Text>
        <Text style={styles.sectionValue}>{quote.providerName ?? '—'}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Prima mensual</Text>
          <Text style={styles.rowValue}>
            {quote.currency} {Number(quote.monthlyPremium ?? 0).toLocaleString('es-AR')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Prima total</Text>
          <Text style={styles.rowValue}>
            {quote.currency} {Number(quote.totalPremium ?? 0).toLocaleString('es-AR')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cobertura</Text>
          <Text style={styles.rowValue}>
            {quote.currency} {Number(quote.coverageAmount ?? 0).toLocaleString('es-AR')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Duración cobertura</Text>
          <Text style={styles.rowValue}>{quote.coverageMonths ?? '—'} meses</Text>
        </View>
      </View>

      <View style={styles.mpCard}>
        <Text style={styles.mpText}>
          El pago se procesa de forma segura a través de Mercado Pago.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.payBtn, paying && styles.payBtnDisabled]}
        onPress={handlePay}
        disabled={paying}
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>💳 Pagar con Mercado Pago</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  sectionValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  mpCard: { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 14, marginBottom: 24 },
  mpText: { fontSize: 13, color: '#075985', lineHeight: 18 },

  payBtn: { backgroundColor: '#009ee3', borderRadius: 8, padding: 16, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successIcon: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
  successBody: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
