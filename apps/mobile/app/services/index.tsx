import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../../lib/api';

const CATEGORIES = [
  { value: 'all', label: 'Todos', emoji: '🔍' },
  { value: 'PLUMBING', label: 'Plomería', emoji: '🔧' },
  { value: 'ELECTRICITY', label: 'Electricidad', emoji: '⚡' },
  { value: 'PAINTING', label: 'Pintura', emoji: '🎨' },
  { value: 'CLEANING', label: 'Limpieza', emoji: '🧹' },
  { value: 'GAS', label: 'Gas', emoji: '🔥' },
  { value: 'OTHER', label: 'Otro', emoji: '📋' },
];

export default function ServicesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [city, setCity] = useState('');

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', selectedCategory, city],
    queryFn: () =>
      servicesApi.searchProviders({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        city: city.trim() || undefined,
      }),
  });

  return (
    <View style={styles.container}>
      {/* Búsqueda por ciudad */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🏙️ Buscar por ciudad..."
          value={city}
          onChangeText={setCity}
          returnKeyType="search"
        />
      </View>

      {/* Tabs de categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.tab, selectedCategory === cat.value && styles.tabActive]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <Text style={styles.tabEmoji}>{cat.emoji}</Text>
            <Text style={[styles.tabLabel, selectedCategory === cat.value && styles.tabLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de proveedores */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
        ) : !providers.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Sin proveedores</Text>
            <Text style={styles.emptyBody}>
              No encontramos proveedores con esos filtros. Probá cambiando la categoría o ciudad.
            </Text>
          </View>
        ) : (
          providers.map((p: any) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => router.push(`/services/provider/${p.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(p.name ?? 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.providerName}>{p.name}</Text>
                  <Text style={styles.providerCategory}>
                    {CATEGORIES.find(c => c.value === p.category)?.emoji ?? '📋'}{' '}
                    {CATEGORIES.find(c => c.value === p.category)?.label ?? p.category}
                  </Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingValue}>
                    ⭐ {Number(p.rating ?? 0).toFixed(1)}
                  </Text>
                  <Text style={styles.reviewCount}>{p.reviewCount ?? 0} reseñas</Text>
                </View>
              </View>
              {p.cities?.length > 0 && (
                <Text style={styles.cities}>
                  📍 {Array.isArray(p.cities) ? p.cities.join(', ') : p.cities}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchBar: { padding: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, fontSize: 15 },

  tabsScroll: { backgroundColor: '#fff', maxHeight: 70 },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', gap: 4 },
  tabActive: { backgroundColor: '#1a56db' },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  tabLabelActive: { color: '#fff', fontWeight: '600' },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1a56db', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  providerCategory: { fontSize: 12, color: '#6b7280' },
  ratingContainer: { alignItems: 'flex-end' },
  ratingValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  reviewCount: { fontSize: 11, color: '#9ca3af' },
  cities: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
