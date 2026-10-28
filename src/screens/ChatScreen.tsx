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
import { chat as chatApi, NetworkError } from "../data/api";
import { colors } from "../theme/colors";

// Interface do Chatbot Empático (fluxo 3 do diagrama). As respostas vêm da
// API (POST /me/chat/messages — Claude com guardrails de TCC e fallback por
// regras no servidor); sem rede, o app usa o motor de regras local de
// src/core/assistant.ts e sinaliza o modo offline.

type Message = {
  id: string;
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
  const { profile, progress, session } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const nextId = useRef(2);
  const localId = () => `local-${nextId.current++}`;

  const ctx: AssistantContext | null = useMemo(
    () => (profile && progress ? { profile, progress } : null),
    [profile, progress]
  );

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      from: "ai",
      text: ctx
        ? welcomeMessage(ctx)
        : "Olá! Como você está lidando com a vontade hoje? Estou aqui se precisar conversar.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  // true quando a última tentativa de falar com a API falhou por rede.
  const [offline, setOffline] = useState(false);

  // Histórico persistido no servidor (uma conversa por usuário).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const { messages: history } = await chatApi.get();
        if (cancelled || history.length === 0) return;
        setMessages(
          history.map((m) => ({ id: m.id, from: m.role === "assistant" ? "ai" : "user", text: m.text }))
        );
        setOffline(false);
      } catch (e) {
        if (!cancelled && e instanceof NetworkError) setOffline(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, typing]);

  const localReply = (text: string) =>
    ctx ? generateReply(text, ctx) : "Estou aqui por você. Me conte mais sobre como está se sentindo.";

  const send = async (raw?: string) => {
    const text = (raw ?? draft).trim();
    if (!text || typing) return;
    setDraft("");
    const userId = localId();
    setMessages((prev) => [...prev, { id: userId, from: "user", text }]);
    setTyping(true);
    try {
      if (!session) throw new NetworkError();
      const reply = await chatApi.send(text);
      setOffline(false);
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userId ? { ...m, id: reply.userMessage.id } : m)),
        { id: reply.assistantMessage.id, from: "ai", text: reply.assistantMessage.text },
      ]);
    } catch (e) {
      // Sem API: Controlador de Contexto & Guardrails local (mesmas regras de TCC).
      if (e instanceof NetworkError) setOffline(true);
      await new Promise((r) => setTimeout(r, 600));
      setMessages((prev) => [...prev, { id: localId(), from: "ai", text: localReply(text) }]);
    } finally {
      setTyping(false);
    }
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

      {offline && (
        <View style={styles.offlineBar}>
          <Feather name="wifi-off" size={12} color={colors.orange600} />
          <Text style={styles.offlineText}>Modo offline — respostas locais</Text>
        </View>
      )}

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
  offlineBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: colors.orange50,
    borderBottomWidth: 1,
    borderBottomColor: colors.orange100,
  },
  offlineText: { fontSize: 11, fontWeight: "600", color: colors.orange600 },
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
