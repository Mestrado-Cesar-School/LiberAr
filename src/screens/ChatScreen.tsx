import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import {
  AssistantContext,
  generateReply,
  QUICK_REPLIES,
  welcomeMessage,
} from "../core/assistant";
import { colors } from "../theme/colors";

// Interface do Chatbot Empático (fluxo 3 do diagrama). As respostas passam
// pelo Controlador de Contexto & Guardrails em src/core/assistant.ts.

type Message = {
  id: number;
  from: "ai" | "user";
  text: string;
};

function AiAvatar({ size }: { size: number }) {
  return (
    <View style={[styles.aiAvatar, { width: size, height: size }]}>
      <Feather name="wind" size={size * 0.5} color={colors.blue500} />
    </View>
  );
}

export function ChatScreen() {
  const { profile, progress } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(2);

  const ctx: AssistantContext | null = useMemo(
    () => (profile && progress ? { profile, progress } : null),
    [profile, progress]
  );

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 1,
      from: "ai",
      text: ctx
        ? welcomeMessage(ctx)
        : "Olá! Como você está lidando com a vontade hoje? Estou aqui se precisar conversar.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const send = (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text || typing) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: nextId.current++, from: "user", text }]);
    setTyping(true);
    // Simula a latência da API de LLM; em produção a chamada real entra aqui.
    setTimeout(() => {
      const reply = ctx
        ? generateReply(text, ctx)
        : "Estou aqui por você. Me conte mais sobre como está se sentindo.";
      setMessages((prev) => [...prev, { id: nextId.current++, from: "ai", text: reply }]);
      setTyping(false);
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AiAvatar size={40} />
          <View style={styles.onlineDot} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Assistente LiberAr</Text>
          <Text style={styles.headerSubtitle}>Sempre aqui por você</Text>
        </View>
      </View>

      {/* Mensagens */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) =>
          message.from === "ai" ? (
            <View key={message.id} style={styles.aiRow}>
              <AiAvatar size={32} />
              <View style={styles.aiBubble}>
                <Text style={styles.aiText}>{message.text}</Text>
              </View>
            </View>
          ) : (
            <View key={message.id} style={styles.userRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{message.text}</Text>
              </View>
            </View>
          )
        )}

        {typing && (
          <View style={styles.aiRow}>
            <AiAvatar size={32} />
            <View style={[styles.aiBubble, styles.typingBubble]}>
              <Text style={styles.typingText}>digitando…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sugestões rápidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickScroll}
        contentContainerStyle={styles.quickRow}
      >
        {QUICK_REPLIES.map((q) => (
          <Pressable key={q} style={styles.quickChip} onPress={() => send(q)}>
            <Text style={styles.quickChipText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Campo de entrada */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <Pressable style={styles.micButton}>
            <Feather name="mic" size={20} color={colors.slate400} />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.slate400}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable style={styles.sendButton} onPress={() => send()}>
            <Feather name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate50,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiAvatar: {
    backgroundColor: colors.blue100,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: colors.green400,
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 999,
  },
  headerTitle: {
    color: colors.slate800,
    fontWeight: "700",
    fontSize: 14,
  },
  headerSubtitle: {
    color: colors.slate400,
    fontSize: 12,
  },
  messages: {
    padding: 24,
    gap: 20,
    paddingBottom: 24,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingRight: 40,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: colors.blue50,
    padding: 16,
    borderRadius: 16,
    borderTopLeftRadius: 0,
  },
  aiText: {
    color: colors.slate700,
    fontSize: 14,
    lineHeight: 22,
  },
  typingBubble: {
    flex: 0,
    paddingVertical: 12,
  },
  typingText: {
    color: colors.slate400,
    fontSize: 13,
    fontStyle: "italic",
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingLeft: 40,
  },
  userBubble: {
    flexShrink: 1,
    backgroundColor: colors.teal500,
    padding: 16,
    borderRadius: 16,
    borderTopRightRadius: 0,
  },
  userText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 22,
  },
  quickScroll: {
    flexGrow: 0,
  },
  quickRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  quickChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.teal100,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.teal600,
  },
  inputBar: {
    backgroundColor: colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    paddingBottom: 112,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.slate50,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  micButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.slate700,
    paddingVertical: 4,
  },
  sendButton: {
    backgroundColor: colors.teal500,
    padding: 10,
    borderRadius: 999,
  },
});
