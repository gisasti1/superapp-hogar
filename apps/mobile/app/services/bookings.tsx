import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../../lib/api';

type BookingStatus = 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  REQUESTED: { label: 'Solicitado', color: '#92400e', bg: '#fffbeb' },
  QUOTED: { label: 'Presupuestado', color: '#1d4ed8', bg: '#eff6ff' },
  ACCEPTED: { label: 'Aceptado', color: '#065f46', bg: '#ecfdf5' },
  IN_PROGRESS: { label: 'En progreso', color: '#7c3aed', bg: '#f5f3ff' },
  COMPLETED: { label: 'Completado', color: '#374151', bg: '#f9fafb' },
};

export default function BookingsScreen() {
  const qc = useQueryClient();
  const [reviewModalBookingId, setReviewModalBookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: servicesApi.getMyBookings,
  });

  const acceptMutation = useMutation({
    mutationFn: (bookingId: string) => servicesApi.acceptQuote(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
    onError: () => Alert.alert('Error', 'No se pudo aceptar el presupuesto.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (bookingId: string) => servicesApi.rejectQuote(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
    onError: () => Alert.alert('Error', 'No se pudo rechazar el presupuesto.'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ bookingId }: { bookingId: string }) =>
      servicesApi.submitReview(bookingId, { rating, comment }),
    onSuccess: () => {
      setReviewModalBookingId(null);
      setRating(5);
      setComment('');
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Reseña enviada', 'Gracias por tu opinión.');
    },
    onError: () => Alert.alert('Error', 'No se pudo enviar la reseña.'),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mis trabajos</Text>

        {!bookings.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={styles.emptyTitle}>Sin trabajos aún</Text>
            <Text style={styles.emptyBody}>
              Cuando solicites un presupuesto a un proveedor, aparecerá acá.
            </Text>
          </View>
        ) : (
          bookings.map((b: any) => {
            const statusKey = b.status as BookingStatus;
            const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.REQUESTED;
            return (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.providerName}>{b.providerName ?? 'Proveedor'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.statusText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>{b.description}</Text>
                <Text style={styles.address}>📍 {b.address}</Text>

                {/* QUOTED: mostrar monto y acciones */}
                {statusKey === 'QUOTED' && b.quotedAmount != null && (
                  <View style={styles.quotedSection}>
                    <Text style={styles.quotedAmount}>
                      Presupuesto: {b.currency ?? 'ARS'}{' '}
                      {Number(b.quotedAmount).toLocaleString('es-AR')}
                    </Text>
                    <View style={styles.quotedActions}>
                      <TouchableOpacity
                        style={[styles.acceptBtn, acceptMutation.isPending && styles.btnDisabled]}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        onPress={() => acceptMutation.mutate(b.id)}
                      >
                        {acceptMutation.isPending ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.acceptBtnText}>✅ Aceptar</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectBtn, rejectMutation.isPending && styles.btnDisabled]}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        onPress={() => rejectMutation.mutate(b.id)}
                      >
                        {rejectMutation.isPending ? (
                          <ActivityIndicator color="#ef4444" size="small" />
                        ) : (
                          <Text style={styles.rejectBtnText}>❌ Rechazar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* COMPLETED sin review */}
                {statusKey === 'COMPLETED' && !b.review && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => setReviewModalBookingId(b.id)}
                  >
                    <Text style={styles.reviewBtnText}>⭐ Dejar reseña</Text>
                  </TouchableOpacity>
                )}

                {/* COMPLETED con review */}
                {statusKey === 'COMPLETED' && b.review && (
                  <View style={styles.reviewedBadge}>
                    <Text style={styles.reviewedText}>
                      ⭐ Reseña enviada: {b.review.rating}/5
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal reseña */}
      <Modal
        visible={!!reviewModalBookingId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModalBookingId(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dejar reseña</Text>
            <TouchableOpacity onPress={() => setReviewModalBookingId(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.starsLabel}>Puntuación</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={styles.star}>{n <= rating ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.starsLabel}>Comentario (opcional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="¿Cómo fue el trabajo?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />

            <TouchableOpacity
              style={[styles.sendReviewBtn, reviewMutation.isPending && styles.btnDisabled]}
              disabled={reviewMutation.isPending}
              onPress={() =>
                reviewMutation.mutate({ bookingId: reviewModalBookingId! })
              }
            >
              {reviewMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendReviewBtnText}>Enviar reseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  providerName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 13, color: '#6b7280', marginBottom: 4, lineHeight: 18 },
  address: { fontSize: 12, color: '#9ca3af' },

  quotedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 },
  quotedAmount: { fontSize: 16, fontWeight: '700', color: '#1a56db', marginBottom: 10 },
  quotedActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#10b981', borderRadius: 8, padding: 10, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '700' },
  rejectBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtnText: { color: '#ef4444', fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },

  reviewBtn: { marginTop: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#f59e0b', borderRadius: 8, padding: 10, alignItems: 'center' },
  reviewBtnText: { color: '#92400e', fontWeight: '600' },
  reviewedBadge: { marginTop: 10, backgroundColor: '#ecfdf5', borderRadius: 8, padding: 8, alignItems: 'center' },
  reviewedText: { color: '#065f46', fontWeight: '600', fontSize: 13 },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 20, color: '#9ca3af', padding: 4 },
  modalContent: { padding: 20 },
  starsLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  star: { fontSize: 32 },
  textArea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 20, marginBottom: 20 },
  sendReviewBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center' },
  sendReviewBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
