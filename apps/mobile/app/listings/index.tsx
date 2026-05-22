import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listingsApi } from '../../lib/api';

const CATEGORIES = ['Todos', 'Studio', '2 amb', '3 amb', '4+ amb'];

export default function ListingsScreen() {
  const [city, setCity] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const minRooms = activeCategory === 'Studio' ? 1
    : activeCategory === '2 amb' ? 2
    : activeCategory === '3 amb' ? 3
    : activeCategory === '4+ amb' ? 4
    : undefined;

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', city, minRooms],
    queryFn: () => listingsApi.search({ city: city || undefined, minRooms }),
  });

  return (
    <View style={styles.container}>
      {/* Búsqueda */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Buscar por ciudad..."
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
        />
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterBtn, activeCategory === cat && styles.filterBtnActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.filterText, activeCategory === cat && styles.filterTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resultados */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#1a56db" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {!listings?.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏘️</Text>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyBody}>Probá con otra ciudad o ajustá los filtros.</Text>
            </View>
          ) : (
            listings.map((p: any) => (
              <TouchableOpacity
                key={p.id}
                style={styles.card}
                onPress={() => router.push(`/listings/${p.id}` as any)}
              >
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageEmoji}>🏠</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.address} numberOfLines={1}>{p.address}</Text>
                  <Text style={styles.city}>{p.city}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.price}>
                      ${Number(p.monthlyRent).toLocaleString('es-AR')} {p.currency}/mes
                    </Text>
                    <Text style={styles.specs}>{p.rooms} amb · {p.squareMeters} m²</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchBar: { padding: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 15 },
  filters: { flexGrow: 0 },
  filtersContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  filterText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 8, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyBody: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  imagePlaceholder: { height: 140, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  imageEmoji: { fontSize: 48 },
  cardBody: { padding: 14 },
  address: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  city: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 15, fontWeight: '700', color: '#1a56db' },
  specs: { fontSize: 12, color: '#9ca3af' },
});
