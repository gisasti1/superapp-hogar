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
import { contractsApi, listingsApi } from '../../lib/api';

const schema = z.object({
  propertyId: z.string().min(1, 'Seleccioná un inmueble'),
  tenantEmail: z.string().email('Email inválido'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  monthlyAmount: z
    .string()
    .min(1, 'Ingresá el monto')
    .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Monto inválido'),
  currency: z.enum(['ARS', 'USD']),
  depositAmount: z
    .string()
    .min(1, 'Ingresá el depósito')
    .refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Monto inválido'),
});

type FormData = z.infer<typeof schema>;

export default function NewContractScreen() {
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'ARS' },
  });

  const selectedPropertyId = watch('propertyId');

  const { data: properties = [] } = useQuery({
    queryKey: ['my-properties'],
    queryFn: listingsApi.getMyProperties,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      contractsApi.create({
        propertyId: data.propertyId,
        tenantEmail: data.tenantEmail,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyAmount: Number(data.monthlyAmount),
        currency: data.currency,
        depositAmount: Number(data.depositAmount),
      }),
    onSuccess: (contract) => {
      router.replace(`/contracts/${contract.id}` as any);
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo crear el contrato. Verificá los datos e intentá de nuevo.');
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nuevo contrato</Text>
      <Text style={styles.subtitle}>Completá los datos para crear el contrato digital.</Text>

      {/* Selector de inmueble */}
      <Text style={styles.label}>Inmueble</Text>
      {!properties.length ? (
        <View style={styles.emptyProperties}>
          <Text style={styles.emptyPropertiesText}>
            No tenés inmuebles registrados. Publicá uno primero.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertiesScroll}>
          {properties.map((p: any) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.propertyChip,
                selectedPropertyId === p.id && styles.propertyChipActive,
              ]}
              onPress={() => setValue('propertyId', p.id)}
            >
              <Text
                style={[
                  styles.propertyChipText,
                  selectedPropertyId === p.id && styles.propertyChipTextActive,
                ]}
                numberOfLines={1}
              >
                {p.address ?? p.title ?? p.id}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {errors.propertyId && (
        <Text style={styles.errorText}>{errors.propertyId.message}</Text>
      )}

      <Text style={styles.label}>Email del inquilino</Text>
      <Controller
        control={control}
        name="tenantEmail"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.tenantEmail && styles.inputError]}
            placeholder="inquilino@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.tenantEmail && (
        <Text style={styles.errorText}>{errors.tenantEmail.message}</Text>
      )}

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Fecha inicio</Text>
          <Controller
            control={control}
            name="startDate"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.startDate && styles.inputError]}
                placeholder="2024-01-01"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.startDate && (
            <Text style={styles.errorText}>{errors.startDate.message}</Text>
          )}
        </View>
        <View style={styles.dateField}>
          <Text style={styles.label}>Fecha fin</Text>
          <Controller
            control={control}
            name="endDate"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.endDate && styles.inputError]}
                placeholder="2026-01-01"
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.endDate && (
            <Text style={styles.errorText}>{errors.endDate.message}</Text>
          )}
        </View>
      </View>

      <Text style={styles.label}>Monto mensual</Text>
      <View style={styles.amountRow}>
        <Controller
          control={control}
          name="monthlyAmount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.inputFlex, errors.monthlyAmount && styles.inputError]}
              placeholder="Ej: 150000"
              keyboardType="numeric"
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="currency"
          render={({ field: { onChange, value } }) => (
            <View style={styles.currencyGroup}>
              {(['ARS', 'USD'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyBtn, value === c && styles.currencyBtnActive]}
                  onPress={() => onChange(c)}
                >
                  <Text style={[styles.currencyText, value === c && styles.currencyTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      </View>
      {errors.monthlyAmount && (
        <Text style={styles.errorText}>{errors.monthlyAmount.message}</Text>
      )}

      <Text style={styles.label}>Depósito en garantía</Text>
      <Controller
        control={control}
        name="depositAmount"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.depositAmount && styles.inputError]}
            placeholder="Generalmente 1 mes de alquiler"
            keyboardType="numeric"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.depositAmount && (
        <Text style={styles.errorText}>{errors.depositAmount.message}</Text>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit(d => createMutation.mutate(d))}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Crear contrato</Text>
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
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16, backgroundColor: '#fff', marginBottom: 4 },
  inputError: { borderColor: '#ef4444' },
  inputFlex: { flex: 1, marginRight: 10 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  currencyGroup: { flexDirection: 'row', gap: 8 },
  currencyBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  currencyBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  currencyText: { fontWeight: '600', color: '#374151' },
  currencyTextActive: { color: '#fff' },
  propertiesScroll: { marginBottom: 4 },
  propertyChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', marginRight: 8 },
  propertyChipActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  propertyChipText: { color: '#374151', fontWeight: '500', fontSize: 13 },
  propertyChipTextActive: { color: '#fff' },
  emptyProperties: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 12, marginBottom: 4 },
  emptyPropertiesText: { color: '#92400e', fontSize: 13 },
  submitBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
