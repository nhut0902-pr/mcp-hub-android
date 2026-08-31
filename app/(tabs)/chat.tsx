/* eslint-disable react-hooks/rules-of-hooks -- useTool is an event helper, not a React Hook. */
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Animated, Easing, FlatList, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ChatToolsSheet } from "@/components/chat-tools-sheet";
import { ChatTuningSheet } from "@/components/chat-tuning-sheet";
import { ChatActionsSheet } from "@/components/chat-actions-sheet";
import { ChatMessageItem } from "@/components/chat-message-item";
import { AiStateIndicator } from "@/components/ai-state-indicator";
import { MidAutumnCampaignPanel } from "@/components/midautumn-campaign-panel";
import { ChatCopilotShelf } from "@/components/chat-copilot-shelf";
import { McpTerminal, type McpTerminalEntry } from "@/components/mcp-terminal";
import { McpRunnerSheet } from "@/components/mcp-runner-sheet";
import { palette } from "@/components/hub-ui";
import { ScreenContainer } from "@/components/screen-container";
import { ChatMessage, parseChatCompletion } from "@/lib/mcp-hub/chat";
import { buildChatPayload } from "@/lib/mcp-hub/chat-payload";
import { ChatTuning, DEFAULT_CHAT_TUNING, loadChatTuning, saveChatTuning } from "@/lib/mcp-hub/chat-settings";
import type { ChatAttachment } from "@/lib/mcp-hub/chat-tools";
import { useHub } from "@/lib/mcp-hub/context";
import { permissionFeedback } from "@/lib/mcp-hub/permission-feedback";
import { getPinnedModels } from "@/lib/mcp-hub/pinned-models";
import { classifyProviderError } from "@/lib/mcp-hub/provider-error";
import { getSendState } from "@/lib/mcp-hub/send-state";
import { getProviderApiKey } from "@/lib/mcp-hub/storage";
import { loadArchivedChats, saveArchivedChat } from "@/lib/mcp-hub/chat-archive";
import { loadWebSearchSettings } from "@/lib/mcp-hub/feature-settings";
import { sendAiCloudChatFromProxy } from "@/lib/mcp-hub/ai-cloud-client";
import { getAiCloudModelDisplayName } from "@/lib/mcp-hub/ai-cloud-brand";
import { APP_VERSION } from "@/lib/mcp-hub/app-update";
import { appendMcpToolResults, extractMcpToolCalls, mcpCallMayChangeExternalData, mcpStructuredFallbackInstruction, summarizeMcpResults, toOpenAiMcpTools, type McpProposedCall } from "@/lib/mcp-hub/mcp-chat";
import type { McpToolCallResult, McpToolDefinition } from "@/lib/mcp-hub/mcp-connection";
import { isMidAutumnCampaignActive } from "@/lib/midautumn-campaign";
import { trpc } from "@/lib/trpc";

type DeviceTool = "location" | "map" | "camera" | "image" | "file";
type ToolNotice = { title: string; detail: string; tone: "success" | "error" | "info" } | null;
type PendingMcpRun = { payload: Record<string, unknown>; response: unknown; calls: McpProposedCall[] };

function isExplicitMcpAction(text: string, tools: McpToolDefinition[] = []): boolean {
  if (/\b(tạo|thêm|sửa|cập nhật|xoá|xóa|gửi|đăng|viết|đọc|tìm|liệt kê|kiểm tra|lấy|create|add|update|delete|send|post|write|read|list|search|get|check)\b/i.test(text)) return true;
  const normalized = text.toLowerCase();
  return tools.some((tool) => normalized.includes(tool.serverName.toLowerCase()) || normalized.includes(tool.name.toLowerCase().replace(/[_-]/g, " ")));
}

export default function ChatScreen() {
  const { state, toggleMcpServer, listMcpTools, callMcpTool } = useHub();
  const router = useRouter();
  const { archiveId } = useLocalSearchParams<{ archiveId?: string }>();
  const sendMutation = trpc.chat.send.useMutation();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tuningVisible, setTuningVisible] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tuning, setTuning] = useState<ChatTuning>(DEFAULT_CHAT_TUNING);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [busyTool, setBusyTool] = useState<DeviceTool | null>(null);
  const [toolNotice, setToolNotice] = useState<ToolNotice>(null);
  const [conversationName, setConversationName] = useState("Untitled");
  const [modelQuery, setModelQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);
  const [midAutumnVisible, setMidAutumnVisible] = useState(false);
  const [mcpTerminalEntries, setMcpTerminalEntries] = useState<McpTerminalEntry[]>([]);
  const [mcpRunnerVisible, setMcpRunnerVisible] = useState(false);
  const drawerSlide = useRef(new Animated.Value(-320)).current;

  useEffect(() => { void loadChatTuning().then(setTuning); void loadWebSearchSettings().then((settings) => setWebSearch(settings.enabledByDefault)); }, []);
  useEffect(() => { if (!archiveId) return; void loadArchivedChats().then((items) => { const archive = items.find((item) => item.id === archiveId); if (archive) { setMessages(archive.messages); setConversationName(archive.name); } }); }, [archiveId]);
  const chatProviders = useMemo(() => state.providers.filter((provider) => provider.enabled && getPinnedModels(provider, state.models).length > 0), [state.models, state.providers]);
  useEffect(() => { if ((!providerId || !chatProviders.some((item) => item.id === providerId)) && chatProviders.length) setProviderId(chatProviders[0].id); }, [chatProviders, providerId]);
  const provider = chatProviders.find((item) => item.id === providerId) ?? chatProviders[0];
  const providerModels = useMemo(() => provider ? getPinnedModels(provider, state.models) : [], [provider, state.models]);
  const model = providerModels.find((item) => item.modelId === modelId) ?? providerModels[0];
  const chatChoices = useMemo(() => chatProviders.flatMap((chatProvider) => getPinnedModels(chatProvider, state.models).map((chatModel) => ({ provider: chatProvider, model: chatModel }))), [chatProviders, state.models]);
  const displayedChoices = useMemo(() => chatChoices.filter((choice) => {
    const matchesQuery = `${choice.provider.name} ${choice.model.displayName} ${choice.model.modelId}`.toLowerCase().includes(modelQuery.trim().toLowerCase());
    return matchesQuery && (!favoritesOnly || favorites.includes(`${choice.provider.id}:${choice.model.modelId}`));
  }).sort((left, right) => Number(Boolean(right.model.supportsThinking)) - Number(Boolean(left.model.supportsThinking))), [chatChoices, favorites, favoritesOnly, modelQuery]);
  const advancedChoiceCount = displayedChoices.filter((choice) => choice.model.supportsThinking).length;
  useEffect(() => { if (model && modelId !== model.modelId) setModelId(model.modelId); }, [model, modelId]);
  useEffect(() => { if (model && !model.supportsThinking) setThinking(false); if (model && !model.supportsWebSearch) setWebSearch(false); }, [model]);

  const changeTuning = (next: ChatTuning) => { setTuning(next); void saveChatTuning(next); };
  const removeAttachment = (id: string) => setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  const startNewChat = () => { setMessages([]); setAttachments([]); setDraft(""); setConversationName("Untitled"); };
  const exportChat = async () => { await Clipboard.setStringAsync(messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n")); Alert.alert("Đã xuất chat", "Nội dung cuộc hội thoại đã được sao chép vào clipboard."); };
  const clearMessages = () => Alert.alert("Xoá toàn bộ tin nhắn", "Thao tác này chỉ xoá tin nhắn của cuộc hội thoại đang mở.", [{ text: "Huỷ", style: "cancel" }, { text: "Xoá", style: "destructive", onPress: () => setMessages([]) }]);
  const archiveChat = async () => { if (!messages.length) { Alert.alert("Chưa có tin nhắn", "Hãy bắt đầu hội thoại trước khi lưu trữ."); return; } await saveArchivedChat({ id: `archive-${Date.now()}`, name: conversationName.trim() || "Untitled", messages, savedAt: new Date().toISOString() }); Alert.alert("Đã lưu hội thoại", "Bạn có thể mở lại trong Settings → Archived Chats."); };
  const lastUserContent = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const openDrawer = () => { drawerSlide.setValue(-320); setDrawerVisible(true); requestAnimationFrame(() => Animated.timing(drawerSlide, { toValue: 0, duration: 210, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()); };
  const closeDrawer = () => Animated.timing(drawerSlide, { toValue: -320, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) setDrawerVisible(false); });
  const updateTitle = () => Alert.prompt?.("Đổi tên cuộc trò chuyện", "Nhập tên mới", (value) => { if (value?.trim()) setConversationName(value.trim()); });
  const toggleFavorite = (key: string) => setFavorites((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  const addLocation = async (openMap: boolean) => {
    setBusyTool(openMap ? "map" : "location");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") { const feedback = permissionFeedback("Vị trí", permission.canAskAgain); setToolNotice({ title: feedback.title, detail: feedback.detail, tone: "error" }); Alert.alert(feedback.title, feedback.detail, feedback.openSettings && Platform.OS !== "web" ? [{ text: "Để sau", style: "cancel" }, { text: feedback.action, onPress: () => void Linking.openSettings() }] : [{ text: "Đã hiểu" }]); return; }
      if (!(await Location.hasServicesEnabledAsync())) throw new Error("Dịch vụ vị trí đang tắt. Hãy bật GPS/Vị trí trên thiết bị rồi thử lại.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      setAttachments((current) => [...current.filter((item) => item.type !== "location"), { id: `location-${Date.now()}`, type: "location", label: `Vị trí ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude }]);
      if (openMap) { await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`); setToolNotice({ title: "Đã mở Bản đồ", detail: "Vị trí hiện tại cũng đã được đính kèm vào tin nhắn kế tiếp.", tone: "success" }); } else setToolNotice({ title: "Đã thêm vị trí", detail: "Toạ độ hiện tại sẽ được gửi cùng tin nhắn kế tiếp.", tone: "success" });
    } catch (error) { const detail = error instanceof Error ? error.message : "Không thể đọc vị trí hiện tại."; setToolNotice({ title: "Không thể dùng vị trí", detail, tone: "error" }); Alert.alert("Không thể dùng vị trí", detail); } finally { setBusyTool(null); }
  };
  const addImage = async (source: "camera" | "image") => {
    setBusyTool(source);
    try {
      if (source === "camera") { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (permission.status !== "granted") { const feedback = permissionFeedback("Camera", permission.canAskAgain); setToolNotice({ title: feedback.title, detail: feedback.detail, tone: "error" }); Alert.alert(feedback.title, feedback.detail, feedback.openSettings && Platform.OS !== "web" ? [{ text: "Để sau", style: "cancel" }, { text: feedback.action, onPress: () => void Linking.openSettings() }] : [{ text: "Đã hiểu" }]); return; } }
      const result = source === "camera" ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.55, base64: true }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.55, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0]; const dataUri = asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri.startsWith("data:") ? asset.uri : undefined;
      if (!dataUri) throw new Error("Không thể đọc dữ liệu ảnh để gửi. Hãy chọn ảnh khác hoặc chụp lại.");
      setAttachments((current) => [...current, { id: `image-${Date.now()}`, type: "image", label: source === "camera" ? "Ảnh vừa chụp" : asset.fileName ?? "Ảnh từ thiết bị", uri: asset.uri, dataUri }]);
    } catch (error) { const title = source === "camera" ? "Không thể dùng Camera" : "Không thể tải ảnh"; const detail = error instanceof Error ? error.message : "Không thể thêm ảnh."; setToolNotice({ title, detail, tone: "error" }); Alert.alert(title, detail); } finally { setBusyTool(null); }
  };
  const addFile = async () => {
    setBusyTool("file");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0]; const type = (asset.mimeType ?? "").toLowerCase(); const name = asset.name.toLowerCase(); const readable = type.startsWith("text/") || /(json|xml|csv|md|markdown|txt|html|css|js|jsx|ts|tsx|py|java|c|cpp|go|rs|sql)$/i.test(name);
      let textContent: string | undefined;
      if (readable) { if ((asset.size ?? 0) > 750_000) throw new Error("Tệp văn bản quá lớn (giới hạn 750 KB). Hãy chọn tệp nhỏ hơn hoặc chỉ trích đoạn cần hỏi."); textContent = (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 })).slice(0, 30_000); }
      setAttachments((current) => [...current, { id: `file-${Date.now()}`, type: "file", label: asset.name, uri: asset.uri, mimeType: asset.mimeType, size: asset.size, textContent }]);
      setToolNotice({ title: readable ? "Đã đọc nội dung tệp" : "Đã chọn tài liệu", detail: readable ? `${asset.name} sẽ được gửi kèm nội dung cho AI.` : `${asset.name} là PDF/tệp nhị phân. Để AI đọc chắc chắn, hãy chụp hoặc gửi ảnh từng trang.`, tone: "success" });
    } catch (error) { const detail = error instanceof Error ? error.message : "Không thể chọn tệp."; setToolNotice({ title: "Không thể chọn tệp", detail, tone: "error" }); Alert.alert("Không thể chọn tệp", detail); } finally { setBusyTool(null); }
  };
  const useTool = async (tool: DeviceTool) => { if (tool === "location") return addLocation(false); if (tool === "map") return addLocation(true); if (tool === "file") return addFile(); return addImage(tool); };
  const canChat = Boolean(provider && model);
  const sendProviderPayload = async (payload: Record<string, unknown>) => provider?.managedByApp ? sendAiCloudChatFromProxy(payload) : await (async () => { const apiKey = await getProviderApiKey(provider!.id); if (!apiKey) throw new Error(`Chưa có API key cho ${provider!.name}. Vào Provider để lưu key lại.`); return sendMutation.mutateAsync({ apiBaseUrl: provider!.apiBaseUrl, apiKey, providerKind: provider!.kind, payload }); })();
  const appendAssistantResponse = (response: unknown) => { const parsed = parseChatCompletion(response); setMessages((current) => [...current, parsed.content ? parsed : { id: `mcp-result-${Date.now()}`, role: "assistant", content: "MCP đã trả kết quả. Hãy xem chi tiết tool ở tin nhắn trước." }]); };
  const loadEnabledMcpTools = async (): Promise<McpToolDefinition[]> => {
    const servers = state.mcpServers.filter((server) => server.enabled && server.connectionStatus === "connected" && server.transport === "streamable-http");
    if (!servers.length) return [];
    const settled = await Promise.all(servers.map(async (server) => { try { return await listMcpTools(server.id); } catch (error) { setToolNotice({ title: `Không tải được tools từ ${server.name}`, detail: error instanceof Error ? error.message : "Hãy kiểm tra kết nối MCP.", tone: "error" }); return []; } }));
    return settled.flat();
  };
  const runManualMcpTool = async (tool: McpToolDefinition, argumentsValue: Record<string, unknown>) => {
    setSending(true); setMcpTerminalEntries([{ id: `manual-${Date.now()}`, command: `${tool.serverName} :: ${tool.name} ${JSON.stringify(argumentsValue).slice(0, 140)}`, status: "running" }]);
    try { const result = await callMcpTool(tool.serverId, tool.name, argumentsValue); const output = result.content.map((item) => typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : JSON.stringify(item)).join(" ").slice(0, 260); setMcpTerminalEntries((current) => current.map((entry) => ({ ...entry, status: result.isError ? "error" : "success", output }))); setMessages((current) => [...current, { id: `mcp-manual-${Date.now()}`, role: "assistant", content: summarizeMcpResults([result]) }]); setToolNotice({ title: result.isError ? "MCP tool báo lỗi" : "Đã chạy MCP tool", detail: `${tool.serverName} · ${tool.name}`, tone: result.isError ? "error" : "success" }); } finally { setSending(false); }
  };
  const executeApprovedMcpTools = async (pending: PendingMcpRun) => {
    setSending(true); setMcpTerminalEntries(pending.calls.map((call) => ({ id: call.id, command: `${call.serverName} :: ${call.toolName} ${JSON.stringify(call.argumentsValue).slice(0, 140)}`, status: "running" })));
    try {
      const results = await Promise.all(pending.calls.map(async (call): Promise<McpToolCallResult> => { try { return await callMcpTool(call.serverId, call.toolName, call.argumentsValue); } catch (error) { return { serverId: call.serverId, serverName: call.serverName, toolName: call.toolName, isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : "Không thể gọi MCP tool." }] }; } }));
      setMcpTerminalEntries(pending.calls.map((call) => { const result = results.find((item) => item.serverId === call.serverId && item.toolName === call.toolName); const output = result?.content.map((item) => typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : JSON.stringify(item)).join(" ").slice(0, 260); return { id: call.id, command: `${call.serverName} :: ${call.toolName} ${JSON.stringify(call.argumentsValue).slice(0, 140)}`, status: result?.isError ? "error" : "success", output }; }));
      setMessages((current) => [...current, { id: `mcp-tools-${Date.now()}`, role: "assistant", content: summarizeMcpResults(results) }]);
      setToolNotice({ title: results.some((result) => result.isError) ? "MCP có tool báo lỗi" : "Đã chạy MCP tool", detail: results.map((result) => `${result.serverName} · ${result.toolName}`).join(" · "), tone: results.some((result) => result.isError) ? "error" : "success" });
      appendAssistantResponse(await sendProviderPayload(appendMcpToolResults(pending.payload, pending.response, pending.calls, results)));
    } catch (error) { setMessages((current) => [...current, { id: `mcp-followup-failure-${Date.now()}`, role: "assistant", content: "MCP đã chạy nhưng AI không thể tổng hợp kết quả: " + (error instanceof Error ? error.message : "lỗi không xác định") }]); }
    finally { setSending(false); }
  };
  const send = async () => {
    const sendState = getSendState(draft, sending); if (!sendState.canSend) { if (sendState.message && !sending) Alert.alert("Chưa thể gửi", sendState.message); return; }
    if (!provider || !model) { Alert.alert("Chưa có model", "Hãy chọn một model đã ghim trước khi gửi tin nhắn."); return; }
    const user: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: draft.trim(), attachments, mcpProfiles: state.mcpServers.filter((server) => server.enabled).map((server) => ({ id: server.id, name: server.name, transport: server.transport, endpoint: server.endpoint })) };
    const history = [...messages, user]; setMessages(history); setDraft(""); setSending(true);
    try { const basePayload = buildChatPayload(provider, model, history, { thinking, webSearch, temperature: tuning.temperature, maxTokens: tuning.maxTokens, topP: tuning.topP, instruction: tuning.instruction }); const mcpTools = await loadEnabledMcpTools(); const payload = mcpTools.length ? { ...basePayload, messages: [{ role: "system", content: mcpStructuredFallbackInstruction(mcpTools) }, ...(Array.isArray(basePayload.messages) ? basePayload.messages : [])], tools: toOpenAiMcpTools(mcpTools), tool_choice: isExplicitMcpAction(user.content, mcpTools) ? "required" : "auto" } : basePayload; let response: unknown; try { response = await sendProviderPayload(payload); } catch (toolError) { if (!mcpTools.length) throw toolError; setToolNotice({ title: "MCP đã nạp tool", detail: "Nhà cung cấp chưa nhận schema tool. Bạn vẫn có thể chạy công cụ thật trong Terminal hoặc Tools.", tone: "info" }); response = await sendProviderPayload(basePayload); } const calls = extractMcpToolCalls(response, mcpTools); if (calls.length) { if (calls.some(mcpCallMayChangeExternalData)) setToolNotice({ title: "Đang chạy MCP action", detail: "Theo cài đặt không hỏi lặp lại, tác vụ đã được AI đề nghị sẽ chạy và được ghi trong MCP Terminal.", tone: "success" }); await executeApprovedMcpTools({ payload, response, calls }); } else { appendAssistantResponse(response); if (mcpTools.length) setToolNotice({ title: "MCP Terminal đã sẵn sàng", detail: "Nhà cung cấp trả lời bằng văn bản. Mở Terminal hoặc Tools để chạy trực tiếp mọi MCP tool đã kết nối.", tone: "info" }); } setAttachments([]); }
    catch (error) { const issue = classifyProviderError(error); setMessages((current) => [...current, { id: `failure-${Date.now()}`, role: "assistant", content: "", failure: { title: issue.title, detail: issue.detail, action: issue.action, providerName: provider.name, modelId: model.modelId, retryText: user.content } }]); setDraft(user.content); } finally { setSending(false); }
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen} testID="chat-screen">
    <View style={styles.header}><Pressable onPress={openDrawer} style={styles.headerIcon}><MaterialIcons name="menu" size={28} color={palette.text} /></Pressable><View style={styles.titleCenter}><Pressable onPress={updateTitle}><Text style={styles.title}>{conversationName}</Text></Pressable><MaterialIcons name="edit" color={palette.textMuted} size={17} /></View><View style={styles.headerRight}><Pressable onPress={() => router.push("/terminal" as never)} style={styles.headerIcon}><MaterialIcons name="terminal" size={24} color={palette.primaryLight} /></Pressable><Pressable onPress={() => router.push("/clawlink" as never)} style={styles.headerIcon}><MaterialIcons name="dns" size={22} color={palette.primaryLight} /></Pressable><Pressable onPress={() => setPickerVisible(true)} style={styles.headerIcon}><MaterialIcons name="search" size={28} color={palette.text} /></Pressable><Pressable onPress={() => setActionsVisible(true)} style={styles.headerIcon}><MaterialIcons name="more-horiz" size={28} color={palette.text} /></Pressable></View></View>
    {toolNotice ? <Pressable onPress={() => setToolNotice(null)} style={[styles.toolNotice, toolNotice.tone === "success" ? styles.toolNoticeSuccess : toolNotice.tone === "error" ? styles.toolNoticeError : styles.toolNoticeInfo]}><MaterialIcons name={toolNotice.tone === "success" ? "check-circle" : toolNotice.tone === "error" ? "error-outline" : "terminal"} size={18} color={toolNotice.tone === "success" ? palette.success : toolNotice.tone === "error" ? palette.error : palette.primaryLight} /><View style={{ flex: 1 }}><Text style={[styles.toolNoticeTitle, { color: toolNotice.tone === "success" ? "#5FE2B4" : toolNotice.tone === "error" ? palette.error : palette.primaryLight }]}>{toolNotice.title}</Text><Text style={styles.toolNoticeDetail}>{toolNotice.detail}</Text></View><MaterialIcons name="close" size={17} color={palette.muted} /></Pressable> : null}
    <McpTerminal entries={mcpTerminalEntries} onClose={() => setMcpTerminalEntries([])} />
    {isMidAutumnCampaignActive() ? <View style={styles.campaignWrap}><MidAutumnCampaignPanel compact onOpen={() => setMidAutumnVisible(true)} /></View> : null}
    {messages.length === 0 ? <ChatCopilotShelf onMath={() => router.push("/ai-math")} onCopilots={() => router.push("/copilots")} /> : null}
    <FlatList data={messages} keyExtractor={(item) => item.id} style={styles.chatList} contentContainerStyle={messages.length ? styles.chatContent : styles.chatEmpty} showsVerticalScrollIndicator={false} ListHeaderComponent={messages.length ? <View style={styles.systemPrompt}><MaterialIcons name="smart-toy" size={16} color="#FFFFFF" /><Text style={styles.systemPromptText}>{tuning.instruction}</Text></View> : null} renderItem={({ item }) => <ChatMessageItem message={item} reasoningOpen={expandedReasoningId === item.id} onToggleReasoning={() => setExpandedReasoningId((current) => current === item.id ? null : item.id)} onCopy={() => void Clipboard.setStringAsync(item.content)} onEdit={() => setDraft(item.content)} onRetry={() => setDraft(item.failure?.retryText ?? lastUserContent)} onMore={() => setActionsVisible(true)} />} ListEmptyComponent={<View style={styles.welcome}><View style={styles.botAvatar}><Image source={require("@/assets/images/icon-ai-chat.png")} style={{ width: 24, height: 24, tintColor: "#FFFFFF" }} /></View><Text style={styles.welcomeTitle}>{canChat ? "What can I help you with today?" : "Chọn model để bắt đầu"}</Text><Text style={styles.welcomeDetail}>{canChat ? "Chọn Tools hoặc bắt đầu một cuộc trò chuyện mới." : "Chạm bộ chọn model ở góc phải khung nhập để chọn model đã ghim."}</Text></View>} />
    {sending ? <View style={styles.sending}><AiStateIndicator state={thinking ? "thinking" : "generate"} /></View> : null}
    <View style={styles.composerWrap}>{attachments.length ? <View style={styles.pendingRow}>{attachments.map((attachment) => <Pressable key={attachment.id} onPress={() => removeAttachment(attachment.id)} style={styles.pendingChip}><MaterialIcons name={attachment.type === "image" ? "image" : "location-on"} color={palette.navy} size={15} /><Text style={styles.pendingText} numberOfLines={1}>{attachment.label}</Text><MaterialIcons name="close" color={palette.muted} size={15} /></Pressable>)}</View> : null}<View style={styles.composer}><TextInput testID="chat-input" value={draft} onChangeText={setDraft} placeholder="Type your question here…" placeholderTextColor="#969696" style={styles.composerInput} multiline maxLength={8000} editable={!sending} /><Pressable testID="chat-send" onPress={() => void send()} disabled={sending} style={({ pressed }) => [styles.sendButton, { opacity: sending ? 0.45 : pressed ? 0.76 : 1 }]}><MaterialIcons name="arrow-upward" color="#1E1E1E" size={23} /></Pressable><View style={styles.composerTools}><Pressable onPress={() => setToolsVisible(true)} style={styles.composerIcon}><MaterialIcons name="add-circle-outline" size={26} color="#E9E9E9" /></Pressable><Pressable onPress={() => setWebSearch((value) => !value)} style={styles.composerIcon}><MaterialIcons name="travel-explore" size={25} color={webSearch ? palette.navy : "#E9E9E9"} /></Pressable><Pressable onPress={() => setThinking((value) => !value)} style={styles.composerIcon}><MaterialIcons name="psychology" size={25} color={thinking ? palette.warning : "#E9E9E9"} /></Pressable><Pressable onPress={() => setTuningVisible(true)} style={styles.composerIcon}><MaterialIcons name="settings" size={24} color="#E9E9E9" /></Pressable><Text style={styles.contextText}>↑ {tuning.maxTokens >= 1000 ? `${tuning.maxTokens / 1000}k` : tuning.maxTokens}</Text><Pressable onPress={() => setPickerVisible(true)} style={styles.modelSelect}><View style={styles.smallModelIcon}><MaterialIcons name="smart-toy" size={14} color="#FFFFFF" /></View><Text style={styles.modelSelectText} numberOfLines={1}>{model ? getAiCloudModelDisplayName(model.modelId, model.displayName) : "Select Model"}</Text><MaterialIcons name="expand-more" size={17} color="#E9E9E9" /></Pressable></View></View></View>
  </View>
    <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}><View style={styles.drawerOverlay}><Pressable style={styles.drawerScrim} onPress={closeDrawer} /><Animated.View style={[styles.drawer, { transform: [{ translateX: drawerSlide }] }]}><View style={styles.drawerBrand}><Pressable testID="drawer-back" onPress={closeDrawer} style={styles.drawerBack}><MaterialIcons name="arrow-back-ios-new" size={17} color={palette.text} /></Pressable><View style={styles.brandIcon}><MaterialIcons name="smart-toy" size={20} color="#FFE381" /></View><Text style={styles.brandTitle}>Chatbox</Text><Text style={styles.version}>V{APP_VERSION}</Text><MaterialIcons name="search" size={22} color={palette.textSecondary} style={{ marginLeft: "auto" }} /></View><ScrollView style={styles.drawerScroll} contentContainerStyle={styles.drawerScrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled><Text style={styles.drawerSection}>Pinned</Text>{["Just chat", "Markdown 101", "Software Developer"].map((item, index) => <Pressable key={item} onPress={() => { setConversationName(item); closeDrawer(); }} style={styles.drawerRow}><MaterialIcons name={index === 2 ? "code" : "chat-bubble-outline"} size={22} color={palette.text} /><Text style={styles.drawerText}>{item}</Text></Pressable>)}<Text style={styles.drawerSection}>Chats</Text><Pressable onPress={closeDrawer} style={styles.drawerRow}><MaterialIcons name="chat-bubble-outline" size={22} color={palette.navy} /><Text style={[styles.drawerText, { color: palette.navy }]}>{conversationName}</Text></Pressable>{messages.slice(-100).reverse().map((message, index) => <Pressable key={message.id} onPress={() => { if (message.content) setDraft(message.content); }} style={styles.drawerRow}><MaterialIcons name="chat-bubble-outline" size={22} color={palette.text} /><Text style={styles.drawerText} numberOfLines={1}>{message.content || `Conversation ${messages.length - index}`}</Text></Pressable>)}</ScrollView><View style={styles.drawerFooter}><Pressable onPress={() => { startNewChat(); closeDrawer(); }} style={styles.drawerPrimary}><MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" /><Text style={styles.drawerPrimaryText}>New Chat</Text></Pressable><Pressable onPress={() => { closeDrawer(); setToolsVisible(true); }} style={styles.drawerPrimary}><MaterialIcons name="image" size={20} color="#FFFFFF" /><Text style={styles.drawerPrimaryText}>Create Image</Text></Pressable><View style={styles.drawerNav}><Pressable onPress={() => { closeDrawer(); router.push("/providers"); }} style={styles.drawerNavItem}><MaterialIcons name="dns" size={23} color={palette.primary} /><Text style={styles.drawerNavText}>Provider</Text></Pressable><Pressable onPress={() => { closeDrawer(); router.push("/settings"); }} style={styles.drawerNavItem}><MaterialIcons name="settings" size={24} color={palette.primary} /><Text style={styles.drawerNavText}>Settings</Text></Pressable><Pressable onPress={() => { closeDrawer(); router.push("/mcp"); }} style={styles.drawerNavItem}><MaterialIcons name="hub" size={23} color={palette.primary} /><Text style={styles.drawerNavText}>MCP</Text></Pressable></View></View></Animated.View></View></Modal>
    <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}><View style={styles.sheetRoot}><Pressable style={styles.sheetScrim} onPress={() => setPickerVisible(false)} /><View style={styles.modelSheet}><View style={styles.modelSheetHeader}><Pressable testID="model-picker-back" onPress={() => setPickerVisible(false)} style={styles.modelSheetBack}><MaterialIcons name="arrow-back-ios-new" size={18} color="#FFFFFF" /></Pressable><Text style={styles.modelSheetTitle}>Models</Text><View style={styles.modelSheetSpacer} pointerEvents="none" /></View><View style={styles.grabber} /><View style={styles.segment}><Pressable onPress={() => setFavoritesOnly(false)} style={[styles.segmentButton, !favoritesOnly && styles.segmentActive]}><Text style={[styles.segmentText, !favoritesOnly && styles.segmentTextActive]}>All</Text></Pressable><Pressable onPress={() => setFavoritesOnly(true)} style={[styles.segmentButton, favoritesOnly && styles.segmentActive]}><Text style={[styles.segmentText, favoritesOnly && styles.segmentTextActive]}>Favorite</Text></Pressable></View><View style={styles.searchBox}><MaterialIcons name="search" size={22} color="#9B9B9B" /><TextInput value={modelQuery} onChangeText={setModelQuery} placeholder="Search models" placeholderTextColor="#969696" style={styles.searchInput} autoCapitalize="none" autoCorrect={false} /></View><FlatList data={displayedChoices} keyExtractor={(item) => `${item.provider.id}:${item.model.id}`} contentContainerStyle={styles.modelList} renderItem={({ item, index }) => { const key = `${item.provider.id}:${item.model.modelId}`; const active = provider?.id === item.provider.id && model?.modelId === item.model.modelId; const startSection = index === 0 || index === advancedChoiceCount; const sectionName = item.model.supportsThinking ? "Advanced" : "Basic"; return <>{startSection ? <View style={styles.providerCaption}><Text style={styles.providerCaptionText}>{sectionName}</Text>{item.model.supportsThinking ? <MaterialIcons name="lock-outline" size={16} color="#BEBEBE" /> : <Text style={styles.byok}>BYOK</Text>}</View> : null}<Pressable onPress={() => { setProviderId(item.provider.id); setModelId(item.model.modelId); setPickerVisible(false); }} style={[styles.modelRow, active && styles.modelRowActive]}><View style={styles.modelRowIcon}>{item.model.imageUrl ? <Image source={{ uri: item.model.imageUrl }} style={styles.modelLogo} /> : <MaterialIcons name="smart-toy" size={19} color="#FFFFFF" />}</View><View style={{ flex: 1 }}><Text style={styles.modelRowName} numberOfLines={1}>{getAiCloudModelDisplayName(item.model.modelId, item.model.displayName)}</Text><Text style={styles.modelRowProvider} numberOfLines={1}>{item.provider.name} · {item.provider.id === "ai-cloud" ? "Nhutbot 1.0 Flash" : item.model.modelId}</Text></View><MaterialIcons name="info-outline" size={17} color="#A7A7A7" />{item.model.supportsWebSearch ? <MaterialIcons name="visibility" size={17} color={palette.navy} /> : null}{item.model.supportsThinking ? <MaterialIcons name="lightbulb-outline" size={17} color="#F2A935" /> : null}<Pressable onPress={() => toggleFavorite(key)} hitSlop={12}><MaterialIcons name={favorites.includes(key) ? "star" : "star-border"} size={23} color={favorites.includes(key) ? "#F2A935" : "#A4A4A4"} /></Pressable></Pressable></>; }} ListEmptyComponent={<Text style={styles.noModels}>Chưa có model đã ghim. Vào Model Provider để tải và ghim model.</Text>} /></View></View></Modal>
    <MidAutumnCampaignPanel visible={midAutumnVisible} onClose={() => setMidAutumnVisible(false)} />
    <ChatTuningSheet visible={tuningVisible} tuning={tuning} conversationName={conversationName} onChangeName={setConversationName} onChange={changeTuning} onClose={() => setTuningVisible(false)} />
    <ChatToolsSheet visible={toolsVisible} servers={state.mcpServers} attachments={attachments} busyTool={busyTool} onClose={() => setToolsVisible(false)} onToggleMcp={(server, enabled) => void toggleMcpServer(server.id, enabled)} onTool={(tool) => void useTool(tool)} onRemoveAttachment={removeAttachment} onRunMcp={() => { setToolsVisible(false); setMcpRunnerVisible(true); }} />
    <McpRunnerSheet visible={mcpRunnerVisible} onClose={() => setMcpRunnerVisible(false)} onLoad={loadEnabledMcpTools} onRun={runManualMcpTool} />
    <ChatActionsSheet visible={actionsVisible} onClose={() => setActionsVisible(false)} onHistory={() => Alert.alert("Thread History", messages.length ? `${messages.length} tin nhắn trong cuộc hội thoại hiện tại.` : "Chưa có tin nhắn nào.")} onArchive={() => void archiveChat()} onExport={() => void exportChat()} onSettings={() => setTuningVisible(true)} onClear={clearMessages} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  header: { height: 56, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: palette.border },
  headerIcon: { width: 38, height: 40, alignItems: "center", justifyContent: "center" },
  titleCenter: { flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  title: { color: palette.text, fontSize: 15, fontWeight: "800" },
  headerRight: { flexDirection: "row", marginLeft: 4, gap: 2 },
  toolNotice: { marginHorizontal: 12, marginTop: 8, padding: 9, borderRadius: 10, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  toolNoticeSuccess: { backgroundColor: "rgba(48,209,88,0.12)", borderWidth: 1, borderColor: "rgba(48,209,88,0.3)" },
  toolNoticeError: { backgroundColor: "rgba(255,69,58,0.12)", borderWidth: 1, borderColor: "rgba(255,69,58,0.3)" },
  toolNoticeInfo: { backgroundColor: "rgba(10,132,255,0.12)", borderWidth: 1, borderColor: "rgba(10,132,255,0.3)" },
  toolNoticeTitle: { fontSize: 11, fontWeight: "800" },
  toolNoticeDetail: { color: palette.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 2 },
  campaignWrap: { paddingHorizontal: 0, paddingTop: 0 },
  chatList: { flex: 1 },
  chatContent: { padding: 16, gap: 11 },
  chatEmpty: { flexGrow: 1, justifyContent: "center", padding: 22 },
  welcome: { alignItems: "center", gap: 9 },
  botAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: palette.navy, alignItems: "center", justifyContent: "center" },
  welcomeTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
  welcomeDetail: { maxWidth: 260, color: palette.muted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  systemPrompt: { alignSelf: "flex-start", maxWidth: "92%", flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: palette.accent, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, marginBottom: 4 },
  systemPromptText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", flexShrink: 1 },
  messageWrap: { gap: 7, maxWidth: "93%" },
  userWrap: { alignSelf: "flex-end" },
  assistantWrap: { alignSelf: "flex-start" },
  bubble: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 },
  userBubble: { backgroundColor: palette.navy, borderBottomRightRadius: 5 },
  assistantBubble: { backgroundColor: palette.surfaceAlt, borderBottomLeftRadius: 5 },
  messageText: { color: palette.text, fontSize: 13, lineHeight: 20 },
  userText: { color: "#FFFFFF" },
  failureCard: { backgroundColor: "rgba(255,69,58,0.12)", borderColor: "rgba(255,69,58,0.4)", gap: 8 },
  failureHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  failureTitle: { color: palette.error, fontSize: 13, fontWeight: "800" },
  failureModel: { color: palette.textSecondary, fontSize: 10, fontFamily: "monospace" },
  failureDetail: { color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  failureAction: { color: palette.error, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  retryButton: { alignSelf: "flex-start", flexDirection: "row", gap: 6, alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, backgroundColor: "rgba(255,69,58,0.2)", borderRadius: 9 },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  reasonCard: { backgroundColor: palette.surfaceAlt, borderRadius: 14, padding: 12, gap: 7 },
  reasonHead: { flexDirection: "row", gap: 7, alignItems: "center" },
  reasonTitle: { color: palette.warning, fontSize: 12, fontWeight: "800", textDecorationLine: "underline" },
  reasonText: { color: palette.textSecondary, fontSize: 12, lineHeight: 18, borderLeftWidth: 3, borderColor: palette.warning, paddingLeft: 9 },
  attachmentPreview: { gap: 6 },
  attachmentImage: { width: 164, height: 108, borderRadius: 11 },
  locationChip: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: palette.surfaceAlt },
  locationChipText: { color: palette.primaryLight, fontSize: 10, maxWidth: 210 },
  citationWrap: { paddingLeft: 7, gap: 3 },
  citationLabel: { color: palette.muted, fontSize: 10, fontWeight: "800" },
  citationText: { color: palette.primaryLight, fontSize: 11 },
  sending: { paddingHorizontal: 16, paddingVertical: 7 },
  composerWrap: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 7, borderTopWidth: 1, borderColor: palette.border },
  pendingRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  pendingChip: { maxWidth: 200, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: palette.surfaceAlt, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  pendingText: { flexShrink: 1, color: palette.primaryLight, fontSize: 10 },
  composer: { minHeight: 116, padding: 12, borderRadius: 21, backgroundColor: palette.surfaceAlt, position: "relative" },
  composerInput: { color: palette.text, fontSize: 13, lineHeight: 19, minHeight: 43, paddingRight: 42, textAlignVertical: "top" },
  sendButton: { position: "absolute", right: 12, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  composerTools: { position: "absolute", bottom: 11, left: 11, right: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  composerIcon: { width: 24, alignItems: "center" },
  contextText: { marginLeft: "auto", color: palette.textMuted, fontSize: 10, fontWeight: "700" },
  modelSelect: { maxWidth: 136, flexDirection: "row", alignItems: "center", gap: 5 },
  smallModelIcon: { width: 20, height: 20, borderRadius: 7, backgroundColor: palette.accent, alignItems: "center", justifyContent: "center" },
  modelSelectText: { color: palette.text, fontSize: 11, fontWeight: "700", flexShrink: 1 },
  drawerOverlay: { flex: 1 },
  drawerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.62)" },
  drawer: { position: "absolute", top: 0, bottom: 0, left: 0, width: "74%", backgroundColor: palette.surfaceElevated, paddingTop: 19, paddingHorizontal: 13 },
  drawerBrand: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingBottom: 19 },
  drawerScroll: { flex: 1 }, drawerScrollContent: { paddingBottom: 12 },
  drawerBack: { width: 28, height: 32, alignItems: "center", justifyContent: "center", marginLeft: -6 },
  brandIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: palette.surfaceElevated, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "800" },
  version: { color: palette.textMuted, fontSize: 12 },
  drawerSection: { color: palette.textMuted, fontSize: 12, fontWeight: "800", paddingHorizontal: 8, paddingTop: 16, paddingBottom: 6 },
  drawerRow: { minHeight: 49, flexDirection: "row", gap: 14, alignItems: "center", paddingHorizontal: 8 },
  drawerText: { color: palette.text, fontSize: 14, flex: 1 },
  drawerFooter: { marginTop: "auto", paddingBottom: 15, gap: 8 },
  drawerPrimary: { height: 45, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 23, backgroundColor: palette.primary },
  drawerPrimaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  drawerNav: { flexDirection: "row", justifyContent: "space-around", paddingTop: 8 },
  drawerNavItem: { alignItems: "center", gap: 2 },
  drawerNavText: { color: palette.textSecondary, fontSize: 9, fontWeight: "700" },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetScrim: { flex: 1, backgroundColor: "rgba(0,0,0,.66)" },
  modelSheet: { height: "74%", backgroundColor: palette.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, borderWidth: 1, borderColor: palette.border, paddingTop: 8 },
  modelSheetHeader: { height: 39, alignItems: "center", justifyContent: "center", marginHorizontal: 14 },
  modelSheetBack: { position: "absolute", left: 0, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modelSheetTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  modelSheetSpacer: { position: "absolute", right: 0, width: 36, height: 36 },
  grabber: { alignSelf: "center", width: 56, height: 4, borderRadius: 3, backgroundColor: palette.textMuted, marginBottom: 12 },
  segment: { flexDirection: "row", marginHorizontal: 16, borderRadius: 18, backgroundColor: palette.surfaceAlt, padding: 3 },
  segmentButton: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 15 },
  segmentActive: { backgroundColor: palette.surfaceElevated },
  segmentText: { color: palette.textSecondary, fontWeight: "800", fontSize: 12 },
  segmentTextActive: { color: "#FFFFFF" },
  searchBox: { height: 53, marginTop: 10, paddingHorizontal: 18, gap: 10, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: palette.border },
  searchInput: { flex: 1, color: palette.text, fontSize: 14, height: 50 },
  providerCaption: { flexDirection: "row", justifyContent: "space-between", backgroundColor: palette.surfaceElevated, paddingHorizontal: 18, paddingVertical: 8 },
  providerCaptionText: { color: palette.text, fontSize: 12, fontWeight: "800" },
  byok: { color: palette.textMuted, fontSize: 10, fontWeight: "800" },
  modelList: { paddingBottom: 30 },
  modelRow: { minHeight: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 9 },
  modelRowActive: { backgroundColor: "#213E59" },
  modelRowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#151515", overflow: "hidden" },
  modelLogo: { width: 32, height: 32, resizeMode: "cover" },
  modelRowName: { color: "#F2F2F2", fontSize: 13, fontWeight: "700" },
  modelRowProvider: { color: "#A0A0A0", fontSize: 9, marginTop: 2, fontFamily: "monospace" },
  noModels: { color: palette.muted, textAlign: "center", padding: 30, fontSize: 12 },
});
