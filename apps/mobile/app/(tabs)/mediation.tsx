import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { mediationApi } from '../../lib/api';
import { CaseStatus } from '@superapp/shared';

const STATUS_LABEL: Record<string, string> = {
  [CaseStatus.OPENED]: 'Abierto',
  [CaseStatus.WAITING_RESPONSE]: 'Esperando respuesta',
  [CaseStatus.BOTH_STATED]: 'Analizando',
  [CaseStatus.AI_ANALYZING]: '🤖 IA analizando',
  [CaseStatus.PROPOSAL_READY]: '📋 Propuesta lista',
  [CaseStatus.ACCEPTED]: '✅ Aceptado',
  [CaseStatus.ESCALATED]: '⬆️ Escalado',
  [CaseStatus.RESOLVED]: '✅ Resuelto',
  [CaseStatus.CLOSED]: 'Cerrado',
};

const STATUS_COLOR: Record<string, string> = {
  [CaseStatus.OPENED]: '#f59e0b',
  [CaseStatus.WAITING_RESPONSE]: '#f59e0b',
  [CaseStatus.BOTH_STATED]: '#3b82f6',
  [CaseStatus.AI_ANALYZING]: '#8b5cf6',
  [CaseStatus.PROPOSAL_READY]: '#10b981',
  [CaseStatus.ACCEPTED]: '#10b981',
  [CaseStatus.ESCALATED]: '#ef4444',
  [CaseStatus.RESOLVED]: '#10b981',
  [CaseStatus.CLOSED]: '#9ca3af',
};

export default function MediationScreen() {
  const { data: cases, isLoading } = useQuery({
    queryKey: ['mediation-cases'],
    queryFn: mediationApi.listCases,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Mediación</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/mediation/new' as any)}
        >
          <Text style={styles.newBtnText}>+ Nuevo caso</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🤖 IA de mediación</Text>
        <Text style={styles.infoBody}>
          Resolvemos conflictos de alquiler en 72hs usando inteligencia artificial
          entrenada en jurisprudencia argentina (CCyC arts. 1187-1226).
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
      ) : !cases?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>Sin casos activos</Text>
          <Text style={styles.emptyBody}>
            Si tenés un conflicto con tu propietario o inquilino, abrí un caso de mediación.
          </Text>
        </View>
      ) : (
        cases.map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            onPress={() => router.push(`/mediation/${c.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{c.category}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[c.status] ?? '#6b7280' }]}>
                {STATUS_LABEL[c.status] ?? c.status}
              </Text>
            </View>
            <Text style={styles.summary} numberOfLines={2}>{c.summary}</Text>
            <Text style={styles.date}>
              Abierto: {new Date(c.createdAt).toLocaleDateString('es-AR')}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  newBtn: { backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  infoCard: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 12, padding: 14, marginBottom: 20 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#075985', marginBottom: 6 },
  infoBody: { fontSize: 13, color: '#0c4a6e', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  category: { fontSize: 13, fontWeight: '700', color: '#374151' },
  status: { fontSize: 12, fontWeight: '600' },
  summary: { fontSize: 14, color: '#6b7280', marginBottom: 8, lineHeight: 20 },
  date: { fontSize: 12, color: '#9ca3af' },
});
