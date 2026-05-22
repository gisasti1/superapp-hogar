import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '../../lib/api';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: property, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id),
  });

  const handleContact = () => {
    Alert.alert(
      'Contactar propietario',
      '¿Cómo querés contactarlo?',
      [
        { text: 'Email', onPress: () => Linking.openURL(`mailto:?subject=Consulta por ${property?.address}`) },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#1a56db" size="large" /></View>;
  }

  if (!property) {
    return <View style={styles.center}><Text style={styles.notFound}>Inmueble no encontrado</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Galería */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
        {property.images?.length ? (
          property.images.map((img: any, i: number) => (
            <View key={i} style={styles.imageSlide}>
              <Text style={styles.imageEmoji}>📷</Text>
            </View>
          ))
        ) : (
          <View style={[styles.imageSlide, styles.imagePlaceholder]}>
            <Text style={styles.imageEmoji}>🏠</Text>
          </View>
        )}
      </ScrollView>

      {/* Precio */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>
          ${Number(property.monthlyRent).toLocaleString('es-AR')} {property.currency}
        </Text>
        <Text style={styles.priceUnit}>/mes</Text>
      </View>

      {/* Dirección */}
      <Text style={styles.address}>{property.address}</Text>
      <Text style={styles.city}>{property.city}, {property.province}</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Stat icon="🚪" label="Ambientes" value={property.rooms} />
        <Stat icon="🚿" label="Baños" value={property.bathrooms} />
        <Stat icon="📐" label="Superficie" value={`${property.squareMeters} m²`} />
      </View>

      {/* Descripción */}
      {property.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{property.description}</Text>
        </View>
      )}

      {/* Acciones */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
          <Text style={styles.contactBtnText}>Contactar propietario</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.favoriteBtn}>
          <Text style={styles.favoriteBtnText}>♡ Guardar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: '#6b7280', fontSize: 16 },
  gallery: { flexGrow: 0 },
  imageSlide: { width: 320, height: 200, marginRight: 12, marginLeft: 4, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#dbeafe' },
  imagePlaceholder: { width: '100%' },
  imageEmoji: { fontSize: 56 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 16 },
  price: { fontSize: 26, fontWeight: '800', color: '#1a56db' },
  priceUnit: { fontSize: 14, color: '#6b7280', marginLeft: 4 },
  address: { fontSize: 18, fontWeight: '700', color: '#111827', paddingHorizontal: 20, marginTop: 6 },
  city: { fontSize: 14, color: '#9ca3af', paddingHorizontal: 20, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  section: { marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 22 },
  actions: { marginHorizontal: 20, marginTop: 28, gap: 12 },
  contactBtn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center' },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  favoriteBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  favoriteBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },
});
