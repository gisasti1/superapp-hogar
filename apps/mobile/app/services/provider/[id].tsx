import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { servicesApi } from '../../../lib/api';

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => servicesApi.getProvider(id!),
    enabled: !!id,
  });

  const quoteMutation = useMutation({
    mutationFn: () =>
      servicesApi.requestQuote(id!, { description, address }),
    onSuccess: () => {
      setModalVisible(false);
      setDescription('');
      setAddress('');
      Alert.alert(
        'Presupuesto solicitado',
        'El proveedor recibirá tu solicitud y te contactará con un presupuesto.',
      );
    },
    onError: () => Alert.alert('Error', 'No se pudo enviar la solicitud.'),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>;
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Proveedor no encontrado.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header del proveedor */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(provider.name ?? 'P').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.category}>{provider.category}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {Number(provider.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({provider.reviewCount ?? 0} reseñas)</Text>
          </View>

          {provider.cities?.length > 0 && (
            <Text style={styles.cities}>
              📍 {Array.isArray(provider.cities) ? provider.cities.join(', ') : provider.cities}
            </Text>
          )}
        </View>

        {/* Descripción */}
        {provider.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sobre el proveedor</Text>
            <Text style={styles.description}>{provider.description}</Text>
          </View>
        )}

        {/* Reseñas */}
        {provider.reviews?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reseñas recientes</Text>
            {provider.reviews.slice(0, 3).map((r: any, i: number) => (
              <View key={r.id ?? i} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{r.authorName ?? 'Usuario'}</Text>
                  <Text style={styles.reviewRating}>{'⭐'.repeat(Math.round(r.rating ?? 5))}</Text>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                <Text style={styles.reviewDate}>
                  {new Date(r.createdAt).toLocaleDateString('es-AR')}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.quoteBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.quoteBtnText}>Solicitar presupuesto</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal presupuesto */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Solicitar presupuesto</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Descripción del trabajo</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describí qué necesitás que haga el proveedor..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.modalLabel}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Av. Corrientes 1234, CABA"
              value={address}
              onChangeText={setAddress}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!description.trim() || !address.trim() || quoteMutation.isPending) &&
                  styles.sendBtnDisabled,
              ]}
              disabled={!description.trim() || !address.trim() || quoteMutation.isPending}
              onPress={() => quoteMutation.mutate()}
            >
              {quoteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Enviar solicitud</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },

  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  category: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rating: { fontSize: 16, fontWeight: '700', color: '#111827' },
  reviewCount: { fontSize: 13, color: '#9ca3af' },
  cities: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 22 },

  reviewItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: '#374151' },
  reviewRating: { fontSize: 12 },
  reviewComment: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: '#9ca3af' },

  quoteBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  quoteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 20, color: '#9ca3af', padding: 4 },
  modalContent: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textArea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, lineHeight: 20, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 15, backgroundColor: '#f9fafb', marginBottom: 20 },
  sendBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
