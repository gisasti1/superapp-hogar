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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { premiumApi } from '../../lib/api';
import { SUBSCRIPTION_PRICE_USD } from '@superapp/shared';

const FREE_FEATURES = [
  'Pagos automáticos de alquiler',
  'Contrato digital básico',
  'Mediación IA (1 caso/año)',
];

const PREMIUM_FEATURES = [
  'Mediación IA ilimitada',
  'Asesoría legal por chat',
  'Auditoría de expensas',
  'Soporte prioritario 24/7',
  'Contrato digital avanzado',
  'Dashboard financiero',
];

export default function PremiumScreen() {
  const qc = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: premiumApi.getSubscription,
  });

  const subscribeMutation = useMutation({
    mutationFn: premiumApi.subscribe,
    onSuccess: async (result) => {
      const url = result.initPoint ?? result.url ?? result.checkoutUrl;
      if (url) {
        await Linking.openURL(url);
      }
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo iniciar la suscripción.'),
  });

  const cancelMutation = useMutation({
    mutationFn: premiumApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] });
      Alert.alert('Cancelado', 'Tu suscripción Premium fue cancelada.');
    },
    onError: () => Alert.alert('Error', 'No se pudo cancelar la suscripción.'),
  });

  const isPremium =
    subscription?.plan === 'PREMIUM' && subscription?.status === 'ACTIVE';

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>SuperApp Premium</Text>
      <Text style={styles.subtitle}>
        Accedé a todas las funciones avanzadas por solo ${SUBSCRIPTION_PRICE_USD}/mes.
      </Text>

      {isPremium ? (
        /* Pantalla de usuario premium */
        <View style={styles.premiumActive}>
          <Text style={styles.premiumIcon}>⭐</Text>
          <Text style={styles.premiumTitle}>Sos Premium</Text>
          {subscription?.renewsAt && (
            <Text style={styles.premiumRenewal}>
              Renovación:{' '}
              {new Date(subscription.renewsAt).toLocaleDateString('es-AR')}
            </Text>
          )}

          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Tus beneficios activos</Text>
            {PREMIUM_FEATURES.map(f => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✅</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancelBtn, cancelMutation.isPending && styles.btnDisabled]}
            disabled={cancelMutation.isPending}
            onPress={() =>
              Alert.alert(
                'Cancelar Premium',
                '¿Confirmás la cancelación de tu suscripción?',
                [
                  { text: 'No', style: 'cancel' },
                  { text: 'Cancelar', style: 'destructive', onPress: () => cancelMutation.mutate() },
                ],
              )
            }
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancelar suscripción</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Comparación FREE vs PREMIUM */
        <>
          <View style={styles.plansRow}>
            {/* Plan FREE */}
            <View style={styles.planCard}>
              <Text style={styles.planName}>FREE</Text>
              <Text style={styles.planPrice}>$0</Text>
              <Text style={styles.planPriceSub}>/mes</Text>
              {FREE_FEATURES.map(f => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureTextSmall}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Plan PREMIUM */}
            <View style={[styles.planCard, styles.planCardPremium]}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Recomendado</Text>
              </View>
              <Text style={[styles.planName, styles.planNamePremium]}>PREMIUM</Text>
              <Text style={[styles.planPrice, styles.planPricePremium]}>
                ${SUBSCRIPTION_PRICE_USD}
              </Text>
              <Text style={[styles.planPriceSub, styles.planPriceSubPremium]}>/mes</Text>
              {PREMIUM_FEATURES.map(f => (
                <View key={f} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, styles.premiumFeatureCheck]}>✅</Text>
                  <Text style={[styles.featureTextSmall, styles.premiumFeatureText]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.subscribeBtn, subscribeMutation.isPending && styles.btnDisabled]}
            disabled={subscribeMutation.isPending}
            onPress={() => subscribeMutation.mutate()}
          >
            {subscribeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeBtnText}>
                ⭐ Suscribirse a Premium — ${SUBSCRIPTION_PRICE_USD}/mes
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Podés cancelar en cualquier momento. El pago se procesa con Mercado Pago.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 28, lineHeight: 20 },

  premiumActive: { alignItems: 'center' },
  premiumIcon: { fontSize: 64, marginBottom: 12 },
  premiumTitle: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 6 },
  premiumRenewal: { fontSize: 14, color: '#6b7280', marginBottom: 24 },

  featuresCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  featuresTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  featureCheck: { fontSize: 14, marginRight: 8, marginTop: 1 },
  featureText: { fontSize: 14, color: '#374151', flex: 1 },
  featureTextSmall: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 18 },

  cancelBtn: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 14, alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.5 },
  cancelBtnText: { color: '#ef4444', fontWeight: '600' },

  plansRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  planCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  planCardPremium: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  planName: { fontSize: 13, fontWeight: '700', color: '#9ca3af', marginBottom: 8, letterSpacing: 1 },
  planNamePremium: { color: '#bfdbfe' },
  planPrice: { fontSize: 28, fontWeight: '700', color: '#111827' },
  planPricePremium: { color: '#fff' },
  planPriceSub: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  planPriceSubPremium: { color: '#93c5fd' },
  popularBadge: { backgroundColor: '#fbbf24', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 },
  popularText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  premiumFeatureCheck: { color: '#86efac' },
  premiumFeatureText: { color: '#e0f2fe' },

  subscribeBtn: { backgroundColor: '#1a56db', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
});
