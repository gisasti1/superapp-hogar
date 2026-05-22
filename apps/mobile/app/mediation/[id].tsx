import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediationApi } from '../../lib/api';
import { CaseStatus, CaseCategory, MEDIATION_HUMAN_COST_USD } from '@superapp/shared';
import { useAuthStore } from '../../stores/auth.store';

const STATUS_STEPS = [
  { status: CaseStatus.OPENED, label: 'Abierto' },
  { status: CaseStatus.BOTH_STATED, label: 'Ambos declararon' },
  { status: CaseStatus.AI_ANALYZING, label: 'IA analizando' },
  { status: CaseStatus.PROPOSAL_READY, label: 'Propuesta lista' },
  { status: CaseStatus.RESOLVED, label: 'Resuelto' },
];

const STATUS_ORDER = [
  CaseStatus.OPENED,
  CaseStatus.WAITING_RESPONSE,
  CaseStatus.BOTH_STATED,
  CaseStatus.AI_ANALYZING,
  CaseStatus.PROPOSAL_READY,
  CaseStatus.ACCEPTED,
  CaseStatus.ESCALATED,
  CaseStatus.RESOLVED,
  CaseStatus.CLOSED,
];

const CATEGORY_LABELS: Record<CaseCategory, string> = {
  [CaseCategory.REPAIRS]: '🔧 Reparaciones',
  [CaseCategory.DEPOSIT_RETURN]: '💰 Devolución depósito',
  [CaseCategory.RENT_INCREASE]: '📈 Aumento de alquiler',
  [CaseCategory.NOISE]: '🔊 Ruidos / molestias',
  [CaseCategory.EXPENSES]: '🏢 Expensas',
  [CaseCategory.EARLY_TERMINATION]: '🚪 Rescisión anticipada',
  [CaseCategory.OTHER]: '📋 Otro',
};

export default function MediationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const [statement, setStatement] = useState('');
  const [message, setMessage] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['mediation-case', id],
    queryFn: () => mediationApi.getCase(id!),
    enabled: !!id,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['mediation-messages', id],
    queryFn: () => mediationApi.getMessages(id!),
    enabled: !!id,
  });

  const statementMutation = useMutation({
    mutationFn: () => mediationApi.submitStatement(id!, statement),
    onSuccess: () => {
      setStatement('');
      qc.invalidateQueries({ queryKey: ['mediation-case', id] });
    },
    onError: () => Alert.alert('Error', 'No se pudo enviar tu declaración.'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => mediationApi.acceptProposal(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mediation-case', id] }),
    onError: () => Alert.alert('Error', 'No se pudo aceptar la propuesta.'),
  });

  const escalateMutation = useMutation({
    mutationFn: () => mediationApi.escalate(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mediation-case', id] }),
    onError: () => Alert.alert('Error', 'No se pudo escalar el caso.'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => mediationApi.sendMessage(id!, message),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['mediation-messages', id] });
    },
    onError: () => Alert.alert('Error', 'No se pudo enviar el mensaje.'),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  if (!caseData) {
    return <View style={styles.center}><Text style={styles.emptyText}>Caso no encontrado.</Text></View>;
  }

  const status = caseData.status as CaseStatus;
  const category = caseData.category as CaseCategory;
  const proposal = caseData.proposal;
  const myStatement = caseData.statements?.find((s: any) => s.userId === user?.id);

  const currentStepIndex = STATUS_STEPS.findIndex(
    s => STATUS_ORDER.indexOf(s.status) >= STATUS_ORDER.indexOf(status),
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.category}>{CATEGORY_LABELS[category] ?? category}</Text>
        <Text style={styles.summary}>{caseData.summary}</Text>
        <Text style={styles.date}>
          Abierto: {new Date(caseData.createdAt).toLocaleDateString('es-AR')}
        </Text>

        {/* Timeline */}
        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <View key={step.status} style={styles.timelineItem}>
                <View style={[styles.timelineDot, done && styles.timelineDotDone, active && styles.timelineDotActive]} />
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineLine, done && styles.timelineLineDone]} />
                )}
                <Text style={[styles.timelineLabel, active && styles.timelineLabelActive]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Declaración propia */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu declaración</Text>
          {myStatement ? (
            <View style={styles.statementBox}>
              <Text style={styles.statementText}>{myStatement.content}</Text>
              <Text style={styles.statementDate}>
                Enviada: {new Date(myStatement.createdAt).toLocaleDateString('es-AR')}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.cardHint}>Aún no enviaste tu declaración.</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Escribí tu versión de los hechos..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={statement}
                onChangeText={setStatement}
              />
              <TouchableOpacity
                style={[styles.actionBtn, (statementMutation.isPending || !statement.trim()) && styles.btnDisabled]}
                disabled={statementMutation.isPending || !statement.trim()}
                onPress={() => statementMutation.mutate()}
              >
                {statementMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Enviar declaración</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Propuesta */}
        {proposal && (
          <View style={styles.proposalCard}>
            <Text style={styles.proposalTitle}>📋 Propuesta de mediación</Text>

            <Text style={styles.proposalSection}>Marco legal</Text>
            <Text style={styles.proposalText}>{proposal.legalFramework}</Text>

            <Text style={styles.proposalSection}>Análisis</Text>
            <Text style={styles.proposalText}>{proposal.analysis}</Text>

            <Text style={styles.proposalSection}>Sugerencia</Text>
            <Text style={styles.proposalText}>{proposal.suggestion}</Text>

            {proposal.commitments?.length > 0 && (
              <>
                <Text style={styles.proposalSection}>Compromisos</Text>
                {proposal.commitments.map((c: string, i: number) => (
                  <View key={i} style={styles.commitmentRow}>
                    <Text style={styles.commitmentBullet}>•</Text>
                    <Text style={styles.commitmentText}>{c}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.deadline}>
              Plazo: {proposal.deadlineDays} días para cumplimiento
            </Text>

            {status === CaseStatus.PROPOSAL_READY && (
              <View style={styles.proposalActions}>
                <TouchableOpacity
                  style={[styles.acceptBtn, acceptMutation.isPending && styles.btnDisabled]}
                  disabled={acceptMutation.isPending || escalateMutation.isPending}
                  onPress={() => acceptMutation.mutate()}
                >
                  {acceptMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.acceptBtnText}>✅ Aceptar propuesta</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.escalateBtn, escalateMutation.isPending && styles.btnDisabled]}
                  disabled={acceptMutation.isPending || escalateMutation.isPending}
                  onPress={() =>
                    Alert.alert(
                      `Escalar a mediador humano ($${MEDIATION_HUMAN_COST_USD})`,
                      'Un mediador humano revisará el caso. Se cobrará una tarifa de $49 USD.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Escalar', onPress: () => escalateMutation.mutate() },
                      ],
                    )
                  }
                >
                  {escalateMutation.isPending ? (
                    <ActivityIndicator color="#7c3aed" />
                  ) : (
                    <Text style={styles.escalateBtnText}>
                      ⬆️ Escalar a mediador humano (${MEDIATION_HUMAN_COST_USD})
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Chat */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💬 Mensajes</Text>
          {loadingMessages ? (
            <ActivityIndicator color="#1a56db" />
          ) : !messages.length ? (
            <Text style={styles.cardHint}>Sin mensajes aún. Iniciá la comunicación.</Text>
          ) : (
            messages.map((msg: any, i: number) => {
              const isMe = msg.senderId === user?.id;
              return (
                <View key={msg.id ?? i} style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                  <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                    {msg.content}
                  </Text>
                  <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                    {new Date(msg.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribí un mensaje..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!message.trim() || sendMessageMutation.isPending) && styles.btnDisabled]}
              disabled={!message.trim() || sendMessageMutation.isPending}
              onPress={() => sendMessageMutation.mutate()}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>→</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },

  category: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  summary: { fontSize: 16, color: '#111827', lineHeight: 22, marginBottom: 8 },
  date: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },

  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 4 },
  timelineItem: { alignItems: 'center', flex: 1, position: 'relative' },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#e5e7eb', marginBottom: 6, zIndex: 1 },
  timelineDotDone: { backgroundColor: '#1a56db' },
  timelineDotActive: { backgroundColor: '#1a56db', width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#bfdbfe' },
  timelineLine: { position: 'absolute', top: 6, left: '50%', right: '-50%', height: 2, backgroundColor: '#e5e7eb' },
  timelineLineDone: { backgroundColor: '#1a56db' },
  timelineLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  timelineLabelActive: { color: '#1a56db', fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  cardHint: { fontSize: 13, color: '#9ca3af', marginBottom: 10 },

  statementBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 },
  statementText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  statementDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 },

  textArea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 20, marginBottom: 10 },
  actionBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontWeight: '600' },

  proposalCard: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#bae6fd' },
  proposalTitle: { fontSize: 16, fontWeight: '700', color: '#075985', marginBottom: 14 },
  proposalSection: { fontSize: 12, fontWeight: '700', color: '#0369a1', marginBottom: 4, textTransform: 'uppercase' },
  proposalText: { fontSize: 14, color: '#0c4a6e', lineHeight: 20, marginBottom: 12 },
  commitmentRow: { flexDirection: 'row', marginBottom: 4 },
  commitmentBullet: { fontSize: 14, color: '#0c4a6e', marginRight: 8 },
  commitmentText: { fontSize: 14, color: '#0c4a6e', flex: 1, lineHeight: 20 },
  deadline: { fontSize: 13, color: '#0369a1', fontWeight: '600', marginTop: 4 },

  proposalActions: { marginTop: 16, gap: 10 },
  acceptBtn: { backgroundColor: '#10b981', borderRadius: 8, padding: 14, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  escalateBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#7c3aed', borderRadius: 8, padding: 14, alignItems: 'center' },
  escalateBtnText: { color: '#7c3aed', fontWeight: '600', fontSize: 14 },

  msgBubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 8 },
  msgMe: { backgroundColor: '#1a56db', alignSelf: 'flex-end' },
  msgOther: { backgroundColor: '#f3f4f6', alignSelf: 'flex-start' },
  msgText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: '#bfdbfe' },
  chatInputRow: { flexDirection: 'row', marginTop: 12, gap: 8, alignItems: 'flex-end' },
  chatInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14, maxHeight: 80 },
  sendBtn: { backgroundColor: '#1a56db', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
