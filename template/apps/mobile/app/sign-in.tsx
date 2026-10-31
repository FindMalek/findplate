import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { authClient } from "@/lib/auth"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const { error: failure } = await authClient.signIn.email({ email, password })
    if (failure) setError(failure.message ?? "Could not sign in.")
    setBusy(false)
  }

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={submit}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 12, padding: 24, justifyContent: "center" },
  input: { borderWidth: 1, borderColor: "#999", padding: 12, fontSize: 16 },
  error: { color: "#c00" },
  button: { backgroundColor: "#111", padding: 14, alignItems: "center" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
})
