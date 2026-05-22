import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { contractsApi, mediationApi } from '../../lib/api';
import { CaseCategory, ContractStatus } from '@superapp/shared';

const CATEGORIES: { value: CaseCategory; label: string; emoji: string }[] = [
  { value: CaseCategory.REPAIRS, label: 'Reparaciones', emoji: '🔧' },
  { value: CaseCategory.DEPOSIT_RETURN, label: 'Devolución depósito', emoji: '💰' },
  { value: CaseCategory.RENT_INCREASE, label: 'Aumento de alquiler', emoji: '📈' },
  { value: CaseCategory.NOISE, label: 'Ruidos / molestias', emoji: '🔊' },
  { value: CaseCategory.EXPENSES, label: 'Expensas', emoji: '🏢' },
  { value: CaseCategory.EARLY_TERMINATION, label: 'Rescisión anticipada', emoji: '🚪' },
  { value: CaseCategory.OTHER, label: 'Otro', emoji: '📋' },
];

const schema = z.object({
  contractId: z.string().min(1, 'Seleccioná un contrato'),
  category: z.nativeEnum(CaseCategory, { errorMap: () => ({ message: 'Elegí una categoría' }) }),
  summary: z.string().min(50, 'Describí el problema (mínimo 50 caracteres)'),
});

type FormData = z.infer<typeof schema>;

export default function NewMediationScreen() {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const selectedContractId = watch('contractId');
  const selectedCategory = watch('category');
  const summaryText = watch('summary') ?? '';

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.list,
  });

  const activeContracts = contracts.filter(
    (c: any) => c.status === ContractStatus.ACTIVE || c.status === ContractStatus.SIGNED,
  );

  const openCaseMutation = useMutation({
    mutationFn: (data: FormData) =>
      mediationApi.openCase({
        contractId: data.contractId,
        category: data.category,
        summary: data.summary,
      }),
    onSuccess: (result) => {
      router.replace(`/mediation/${result.id}` as any);
    },
    onError: () => Alert.alert('Error', 'No se pudo abrir el caso. Intentá de nuevo.'),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Abrir caso de mediación</Text>
      <Text style={styles.subtitle}>
        Describí el conflicto y la IA lo resolverá en hasta 72hs.
      </Text>

      {/* Selector de contrato */}
      <Text style={styles.label}>Contrato activo</Text>
      {!activeContracts.length ? (
        <View style={styles.noContracts}>
          <Text style={styles.noContractsText}>
            No tenés contratos activos para abrir un caso.
          </Text>
        </View>
      ) : (
        activeContracts.map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.contractCard,
              selectedContractId === c.id && styles.contractCardActive,
            ]}
            onPress={() => setValue('contractId', c.id)}
          >
            <Text style={[styles.contractAddr, selectedContractId === c.id && styles.contractAddrActive]}>
              {c.property?.address ?? 'Contrato ' + c.id.slice(0, 8)}
            </Text>
            <Text style={styles.contractDetail}>
              {c.currency} {Number(c.monthlyAmount).toLocaleString('es-AR')}/mes
            </Text>
          </TouchableOpacity>
        ))
      )}
      {errors.contractId && (
        <Text style={styles.errorText}>{errors.contractId.message}</Text>
      )}

      {/* Categoría */}
      <Text style={[styles.label, { marginTop: 20 }]}>¿Cuál es el problema?</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryBtn,
              selectedCategory === cat.value && styles.categoryBtnActive,
            ]}
            onPress={() => setValue('category', cat.value)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.value && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.category && (
        <Text style={styles.errorText}>{errors.category.message}</Text>
      )}

      {/* Descripción */}
      <Text style={[styles.label, { marginTop: 20 }]}>Describí el problema</Text>
      <Text style={styles.hint}>Mínimo 50 caracteres. Sé específico para obtener la mejor mediación.</Text>
      <Controller
        control={control}
        name="summary"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.textArea, errors.summary && styles.inputError]}
            placeholder="Contanos en detalle qué pasó, desde cuándo ocurre y qué resolución esperás..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      <Text style={styles.charCount}>{summaryText.length} / 50 mínimo</Text>
      {errors.summary && (
        <Text style={styles.errorText}>{errors.summary.message}</Text>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, openCaseMutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit(d => openCaseMutation.mutate(d))}
        disabled={openCaseMutation.isPending}
      >
        {openCaseMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Abrir caso de mediación</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },

  noContracts: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 12, marginBottom: 4 },
  noContractsText: { color: '#92400e', fontSize: 13 },

  contractCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  contractCardActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  contractAddr: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
  contractAddrActive: { color: '#1a56db' },
  contractDetail: { fontSize: 12, color: '#9ca3af' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryBtn: { width: '46%', backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  categoryBtnActive: { backgroundColor: '#eff6ff', borderColor: '#1a56db' },
  categoryEmoji: { fontSize: 28, marginBottom: 6 },
  categoryLabel: { fontSize: 12, color: '#374151', textAlign: 'center', fontWeight: '500' },
  categoryLabelActive: { color: '#1a56db', fontWeight: '700' },

  textArea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 15, backgroundColor: '#fff', minHeight: 120, lineHeight: 22 },
  inputError: { borderColor: '#ef4444' },
  charCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 4 },

  submitBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
