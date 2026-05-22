import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { insuranceApi } from '../../lib/api';
import { QuoteOption } from '@superapp/shared';

export default function InsuranceResultsScreen() {
  const { quotesJson } = useLocalSearchParams<{ quotesJson: string }>();
  const [selecting, setSelecting] = useState<string | null>(null);

  let quotes: QuoteOption[] = [];
  try {
    quotes = JSON.parse(quotesJson ?? '[]');
  } catch {
    // fallback a mocks si el JSON es inválido
    quotes = MOCK_QUOTES;
  }

  if (!quotes.length) {
    quotes = MOCK_QUOTES;
  }

  const handleSelect = async (quote: QuoteOption & { id?: string }) => {
    const quoteId = quote.id ?? quote.providerId;
    setSelecting(quoteId);
    try {
      const result = await insuranceApi.selectQuote(quoteId);
      router.push({
        pathname: '/insurance/checkout',
        params: {
          policyId: result.policyId ?? result.id ?? quoteId,
          quoteJson: JSON.stringify(quote),
        },
      } as any);
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el plan. Intentá de nuevo.');
    } finally {
      setSelecting(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Planes disponibles</Text>
      <Text style={styles.subtitle}>
        Elegí el plan que mejor se adapte a tus necesidades.
      </Text>

      {quotes.map((q: any, i) => (
        <View key={q.providerId ?? i} style={[styles.card, i === 0 && styles.cardHighlighted]}>
          {i === 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Recomendado</Text>
            </View>
          )}
          <Text style={styles.providerName}>{q.providerName}</Text>

          <View style={styles.priceRow}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Prima mensual</Text>
              <Text style={styles.priceValue}>
                {q.currency} {Number(q.monthlyPremium).toLocaleString('es-AR')}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Prima total</Text>
              <Text style={styles.priceValue}>
                {q.currency} {Number(q.totalPremium).toLocaleString('es-AR')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.coverageRow}>
            <Text style={styles.coverageLabel}>Cobertura</Text>
            <Text style={styles.coverageValue}>
              {q.currency} {Number(q.coverageAmount).toLocaleString('es-AR')}
              {' '}({q.coverageMonths} meses)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.selectBtn, selecting === (q.id ?? q.providerId) && styles.selectBtnDisabled]}
            disabled={selecting !== null}
            onPress={() => handleSelect(q)}
          >
            {selecting === (q.id ?? q.providerId) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.selectBtnText}>Elegir este plan</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const MOCK_QUOTES: QuoteOption[] = [
  {
    providerId: 'mock-1',
    providerName: 'Federación Patronal',
    monthlyPremium: 4500,
    totalPremium: 108000,
    coverageAmount: 450000,
    coverageMonths: 6,
    currency: 'ARS',
  },
  {
    providerId: 'mock-2',
    providerName: 'Sancor Seguros',
    monthlyPremium: 5200,
    totalPremium: 124800,
    coverageAmount: 520000,
    coverageMonths: 6,
    currency: 'ARS',
  },
  {
    providerId: 'mock-3',
    providerName: 'Mercantil Andina',
    monthlyPremium: 3900,
    totalPremium: 93600,
    coverageAmount: 390000,
    coverageMonths: 5,
    currency: 'ARS',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHighlighted: { borderColor: '#1a56db', borderWidth: 2 },
  badge: { backgroundColor: '#1a56db', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  providerName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 14 },

  priceRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  priceBlock: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 },
  priceLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  priceValue: { fontSize: 16, fontWeight: '700', color: '#111827' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
  coverageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  coverageLabel: { fontSize: 14, color: '#6b7280' },
  coverageValue: { fontSize: 14, fontWeight: '600', color: '#374151' },

  selectBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  selectBtnDisabled: { opacity: 0.5 },
  selectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
