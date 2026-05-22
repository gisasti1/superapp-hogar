import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { kycApi, kycApiExtra } from '../../lib/api';
import { VerificationStatus } from '@superapp/shared';

const STEPS = ['Subir DNI', 'Selfie', 'Validar'];

export default function KycScreen() {
  const [step, setStep] = useState(0);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  const { data: kycStatus, refetch } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: kycApi.getStatus,
  });

  const uploadDniMutation = useMutation({
    mutationFn: () => kycApi.uploadDni(frontUri!, backUri!),
    onSuccess: () => setStep(1),
    onError: () => Alert.alert('Error', 'No se pudo subir el DNI. Intentá de nuevo.'),
  });

  const uploadSelfieMutation = useMutation({
    mutationFn: () => kycApi.uploadSelfie(selfieUri!),
    onSuccess: () => setStep(2),
    onError: () => Alert.alert('Error', 'No se pudo subir la selfie. Intentá de nuevo.'),
  });

  const validateMutation = useMutation({
    mutationFn: kycApiExtra.validateWithRenaper,
    onSuccess: () => refetch(),
    onError: () => Alert.alert('Error', 'La validación con RENAPER falló. Verificá tus fotos.'),
  });

  const pickImage = async (setter: (uri: string) => void, camera = false) => {
    const fn = camera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const status = kycStatus?.status as VerificationStatus | undefined;

  if (status === VerificationStatus.VERIFIED) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Identidad verificada</Text>
        <Text style={styles.successBody}>
          Tu identidad fue verificada correctamente con RENAPER.
        </Text>
      </View>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <View style={styles.center}>
        <Text style={styles.rejectedIcon}>❌</Text>
        <Text style={styles.rejectedTitle}>Verificación rechazada</Text>
        <Text style={styles.rejectedBody}>
          No pudimos verificar tu identidad. Contactá a soporte para más información.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verificá tu identidad</Text>
      <Text style={styles.subtitle}>
        Necesitamos verificar tu identidad para habilitarte todas las funciones.
      </Text>

      {/* Stepper */}
      <View style={styles.stepper}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepWrapper}>
            <View style={[styles.stepCircle, i <= step && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>
                {i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>
              {label}
            </Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>

      {/* Paso 0: DNI */}
      {step === 0 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Foto del DNI</Text>
          <Text style={styles.stepDesc}>
            Tomá una foto del frente y dorso de tu DNI en un lugar bien iluminado.
          </Text>

          <Text style={styles.photoLabel}>Frente del DNI</Text>
          {frontUri ? (
            <Image source={{ uri: frontUri }} style={styles.previewImg} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Sin foto</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => pickImage(setFrontUri, true)}
          >
            <Text style={styles.photoBtnText}>📷 Tomar foto del frente</Text>
          </TouchableOpacity>

          <Text style={[styles.photoLabel, { marginTop: 16 }]}>Dorso del DNI</Text>
          {backUri ? (
            <Image source={{ uri: backUri }} style={styles.previewImg} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>Sin foto</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => pickImage(setBackUri, true)}
          >
            <Text style={styles.photoBtnText}>📷 Tomar foto del dorso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!frontUri || !backUri || uploadDniMutation.isPending) && styles.primaryBtnDisabled,
            ]}
            disabled={!frontUri || !backUri || uploadDniMutation.isPending}
            onPress={() => uploadDniMutation.mutate()}
          >
            {uploadDniMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continuar →</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Paso 1: Selfie */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Tomá una selfie</Text>
          <Text style={styles.stepDesc}>
            Mirá a la cámara con buena iluminación y sin accesorios que tapen tu rostro.
          </Text>

          {selfieUri ? (
            <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Text style={styles.selfieIcon}>🤳</Text>
              <Text style={styles.photoPlaceholderText}>Sin selfie</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => pickImage(setSelfieUri, true)}
          >
            <Text style={styles.photoBtnText}>📷 Tomar selfie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!selfieUri || uploadSelfieMutation.isPending) && styles.primaryBtnDisabled,
            ]}
            disabled={!selfieUri || uploadSelfieMutation.isPending}
            onPress={() => uploadSelfieMutation.mutate()}
          >
            {uploadSelfieMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continuar →</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Paso 2: Validar */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Validación con RENAPER</Text>
          <Text style={styles.stepDesc}>
            Vamos a comparar tus fotos con la base de datos del RENAPER para confirmar
            tu identidad. Este proceso puede tardar unos segundos.
          </Text>

          {status === VerificationStatus.IN_PROGRESS && (
            <View style={styles.inProgressCard}>
              <ActivityIndicator color="#1a56db" />
              <Text style={styles.inProgressText}>Verificación en proceso...</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (validateMutation.isPending || status === VerificationStatus.IN_PROGRESS) &&
                styles.primaryBtnDisabled,
            ]}
            disabled={
              validateMutation.isPending || status === VerificationStatus.IN_PROGRESS
            }
            onPress={() => validateMutation.mutate()}
          >
            {validateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verificar con RENAPER</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 28, lineHeight: 20 },

  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, position: 'relative' },
  stepWrapper: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepCircleActive: { backgroundColor: '#1a56db' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#9ca3af' },
  stepNumActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  stepLabelActive: { color: '#1a56db', fontWeight: '600' },
  stepLine: { position: 'absolute', top: 16, right: '-50%', width: '100%', height: 2, backgroundColor: '#e5e7eb' },
  stepLineActive: { backgroundColor: '#1a56db' },

  stepContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20 },

  photoLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  previewImg: { width: '100%', height: 180, borderRadius: 8, marginBottom: 8, resizeMode: 'cover' },
  photoPlaceholder: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  photoPlaceholderText: { color: '#9ca3af', fontSize: 14 },
  photoBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#1a56db', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8 },
  photoBtnText: { color: '#1a56db', fontWeight: '600', fontSize: 14 },

  selfiePreview: { width: 200, height: 200, borderRadius: 100, alignSelf: 'center', marginBottom: 12 },
  selfiePlaceholder: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  selfieIcon: { fontSize: 48, marginBottom: 4 },

  primaryBtn: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  inProgressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 8, padding: 14, marginBottom: 12, gap: 10 },
  inProgressText: { color: '#1a56db', fontWeight: '600' },

  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  successBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  rejectedIcon: { fontSize: 64, marginBottom: 16 },
  rejectedTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  rejectedBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
