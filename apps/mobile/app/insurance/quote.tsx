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
import { insuranceApi } from '../../lib/api';

const schema = z.object({
  propertyAddress: z.string().min(5, 'Ingresá la dirección completa'),
  city: z.string().min(2, 'Ingresá la ciudad'),
  monthlyRent: z
    .string()
    .min(1, 'Ingresá el monto')
    .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Monto inválido'),
  currency: z.enum(['ARS', 'USD']),
  contractMonths: z
    .string()
    .min(1, 'Ingresá la duración')
    .refine(v => !isNaN(Number(v)) && Number(v) >= 1, 'Mínimo 1 mes'),
  tenantDni: z.string().min(7, 'DNI inválido').max(8, 'DNI inválido'),
});

type FormData = z.infer<typeof schema>;

export default function InsuranceQuoteScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'ARS' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await insuranceApi.quote({
        propertyAddress: data.propertyAddress,
        city: data.city,
        monthlyRent: Number(data.monthlyRent),
        currency: data.currency,
        contractMonths: Number(data.contractMonths),
        tenantDni: data.tenantDni,
      });
      router.push({
        pathname: '/insurance/results',
        params: { quotesJson: JSON.stringify(result) },
      } as any);
    } catch {
      Alert.alert('Error', 'No se pudo obtener la cotización. Intentá de nuevo.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Seguro de caución</Text>
      <Text style={styles.subtitle}>
        Completá los datos del inmueble para cotizar tu seguro.
      </Text>

      <Text style={styles.label}>Dirección del inmueble</Text>
      <Controller
        control={control}
        name="propertyAddress"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.propertyAddress && styles.inputError]}
            placeholder="Ej: Av. Corrientes 1234, Piso 2"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.propertyAddress && (
        <Text style={styles.errorText}>{errors.propertyAddress.message}</Text>
      )}

      <Text style={styles.label}>Ciudad</Text>
      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            placeholder="Ej: Buenos Aires"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.city && <Text style={styles.errorText}>{errors.city.message}</Text>}

      <Text style={styles.label}>Alquiler mensual</Text>
      <View style={styles.row}>
        <Controller
          control={control}
          name="monthlyRent"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.inputFlex, errors.monthlyRent && styles.inputError]}
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
      {errors.monthlyRent && (
        <Text style={styles.errorText}>{errors.monthlyRent.message}</Text>
      )}

      <Text style={styles.label}>Duración del contrato (meses)</Text>
      <Controller
        control={control}
        name="contractMonths"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.contractMonths && styles.inputError]}
            placeholder="Ej: 24"
            keyboardType="numeric"
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.contractMonths && (
        <Text style={styles.errorText}>{errors.contractMonths.message}</Text>
      )}

      <Text style={styles.label}>DNI del inquilino</Text>
      <Controller
        control={control}
        name="tenantDni"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.tenantDni && styles.inputError]}
            placeholder="Ej: 35123456"
            keyboardType="numeric"
            maxLength={8}
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.tenantDni && (
        <Text style={styles.errorText}>{errors.tenantDni.message}</Text>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Cotizar seguro</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  currencyGroup: { flexDirection: 'row', gap: 8 },
  currencyBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  currencyBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  currencyText: { fontWeight: '600', color: '#374151' },
  currencyTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
