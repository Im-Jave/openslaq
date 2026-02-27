import { useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileTheme } from "@/theme/ThemeProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleIcon, GitHubIcon, AppleIcon } from "@/components/ui/BrandIcons";

type AuthStep = "email" | "otp";

export default function SignInScreen() {
  const { sendOtp, verifyOtp, signInWithApple, signInWithOAuth } = useAuth();
  const { theme } = useMobileTheme();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [nonce, setNonce] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const n = await sendOtp(email.trim());
      setNonce(n);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(otpCode.trim(), nonce);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtpCode("");
    setNonce("");
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
    >
      <View testID="sign-in-screen" className="flex-1 justify-center px-8">
        <Text style={{ color: theme.colors.textPrimary }} className="text-3xl font-bold text-center mb-2">
          OpenSlaq
        </Text>
        <Text style={{ color: theme.colors.textMuted }} className="text-center mb-8">
          {step === "email"
            ? "Sign in to your workspace"
            : `Enter the code sent to ${email}`}
        </Text>

        {error && (
          <View
            testID="error-view"
            className="rounded-lg p-3 mb-4"
            style={{
              backgroundColor: theme.colors.dangerBg,
              borderColor: theme.colors.dangerBorder,
              borderWidth: 1,
            }}
          >
            <Text className="text-sm" style={{ color: theme.colors.dangerText }}>{error}</Text>
          </View>
        )}

        {step === "email" ? (
          <>
            <Input
              testID="email-input"
              style={{ marginBottom: 16 }}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Button
              testID="submit-button"
              label="Continue"
              onPress={handleSendOtp}
              disabled={loading}
              style={{ marginBottom: 12, opacity: loading ? 0.7 : 1 }}
            />
          </>
        ) : (
          <>
            <Input
              testID="otp-input"
              style={{ marginBottom: 16 }}
              placeholder="Verification code"
              value={otpCode}
              onChangeText={setOtpCode}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Button
              testID="verify-button"
              label="Verify"
              onPress={handleVerifyOtp}
              disabled={loading}
              style={{ marginBottom: 12, opacity: loading ? 0.7 : 1 }}
            />

            <Pressable testID="back-button" onPress={handleBack} disabled={loading}>
              <Text className="text-center text-sm" style={{ color: theme.brand.primary }}>
                Back
              </Text>
            </Pressable>
          </>
        )}

        {loading && <ActivityIndicator color={theme.brand.primary} style={{ marginBottom: 12 }} />}

        <View className="my-6 flex-row items-center">
          <View className="flex-1 h-px" style={{ backgroundColor: theme.colors.borderDefault }} />
          <Text className="mx-4 text-sm" style={{ color: theme.colors.textFaint }}>or</Text>
          <View className="flex-1 h-px" style={{ backgroundColor: theme.colors.borderDefault }} />
        </View>

        <Button
          label="Continue with Google"
          icon={<GoogleIcon />}
          onPress={() => handleOAuth("google")}
          disabled={loading}
          variant="outline"
          style={{ marginBottom: 12 }}
        />

        <Button
          label="Continue with GitHub"
          icon={<GitHubIcon color={theme.colors.textPrimary} />}
          onPress={() => handleOAuth("github")}
          disabled={loading}
          variant="outline"
          style={{ marginBottom: 12 }}
        />

        {Platform.OS === "ios" && (
          <Button
            testID="apple-sign-in"
            label="Continue with Apple"
            icon={<AppleIcon color={theme.colors.textPrimary} />}
            onPress={handleAppleSignIn}
            disabled={loading}
            variant="outline"
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
