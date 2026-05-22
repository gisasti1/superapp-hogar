import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../lib/api';
import { UserRole } from '@superapp/shared';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Debe tener mayúscula, minúscula y número'),
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  phone: z.string().optional(),
  role: z.enum([UserRole.TENANT, UserRole.LANDLORD]),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const setAuth = useAuthStore(s => s.setAuth);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: UserRole.TENANT },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register(data);
      setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo registrar');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      {(['firstName', 'lastName', 'email', 'phone'] as const).map(field => (
        <Controller
          key={field}
          control={control}
          name={field}
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={[styles.input, errors[field] && styles.inputError]}
                placeholder={field === 'firstName' ? 'Nombre' : field === 'lastName' ? 'Apellido' : field === 'email' ? 'Email' : 'Teléfono (opcional)'}
                autoCapitalize={field === 'email' || field === 'phone' ? 'none' : 'words'}
                keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                onChangeText={onChange}
                value={value ?? ''}
              />
              {errors[field] && <Text style={styles.errorText}>{errors[field]?.message}</Text>}
            </>
          )}
        />
      ))}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Contraseña"
            secureTextEntry
            onChangeText={onChange}
            value={value}
          />
        )}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

      <Text style={styles.label}>Soy:</Text>
      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View style={styles.roleRow}>
            {[UserRole.TENANT, UserRole.LANDLORD].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, value === r && styles.roleBtnActive]}
                onPress={() => onChange(r)}
              >
                <Text style={[styles.roleBtnText, value === r && styles.roleBtnTextActive]}>
                  {r === UserRole.TENANT ? 'Inquilino' : 'Propietario'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarme</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/login" style={styles.link}>¿Ya tenés cuenta? Ingresá</Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a56db', textAlign: 'center', marginBottom: 28 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 4, backgroundColor: '#f9fafb' },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, alignItems: 'center' },
  roleBtnActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  roleBtnText: { color: '#6b7280', fontWeight: '500' },
  roleBtnTextActive: { color: '#1a56db' },
  button: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 20, color: '#1a56db' },
});
