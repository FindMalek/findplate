import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth"

export default function Notes() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => api.notes.list() })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes"] })
  const create = useMutation({
    mutationFn: (value: string) => api.notes.create({ title: value }),
    onSuccess: () => {
      setTitle("")
      return refresh()
    },
  })
  const remove = useMutation({ mutationFn: (id: string) => api.notes.remove({ id }), onSuccess: refresh })

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.grow]} placeholder="New note" value={title} onChangeText={setTitle} />
        <Pressable
          style={styles.button}
          disabled={!title.trim() || create.isPending}
          onPress={() => create.mutate(title)}
        >
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>
      {notes.error && <Text style={styles.error}>Could not load notes.</Text>}
      <FlatList
        data={notes.data ?? []}
        keyExtractor={(note) => note.id}
        refreshing={notes.isRefetching}
        onRefresh={() => notes.refetch()}
        ListEmptyComponent={notes.isPending ? undefined : <Text style={styles.muted}>No notes yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, styles.note]}>
            <Text style={styles.grow}>{item.title}</Text>
            <Pressable onPress={() => remove.mutate(item.id)}>
              <Text style={styles.muted}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable onPress={() => authClient.signOut()}>
        <Text style={styles.muted}>Sign out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 12, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
  input: { borderWidth: 1, borderColor: "#999", padding: 10, fontSize: 16 },
  button: { backgroundColor: "#111", paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { color: "#fff", fontWeight: "600" },
  note: { borderBottomWidth: 1, borderBottomColor: "#ddd", paddingVertical: 12 },
  muted: { color: "#777" },
  error: { color: "#c00" },
})
