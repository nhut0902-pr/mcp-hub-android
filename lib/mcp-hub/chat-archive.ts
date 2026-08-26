import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ChatMessage } from "./chat";

export type ArchivedChat = { id: string; name: string; messages: ChatMessage[]; savedAt: string };
const ARCHIVE_KEY = "mcp-hub.archived-chats.v1";
export async function loadArchivedChats(): Promise<ArchivedChat[]> { try { const raw = await AsyncStorage.getItem(ARCHIVE_KEY); const data = raw ? JSON.parse(raw) : []; return Array.isArray(data) ? data.filter((item): item is ArchivedChat => Boolean(item?.id && item?.name && Array.isArray(item?.messages))).slice(0, 50) : []; } catch { return []; } }
export async function saveArchivedChat(chat: ArchivedChat): Promise<ArchivedChat[]> { const current = await loadArchivedChats(); const next = [chat, ...current.filter((item) => item.id !== chat.id)].slice(0, 50); await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next)); return next; }
export async function removeArchivedChat(id: string): Promise<ArchivedChat[]> { const next = (await loadArchivedChats()).filter((item) => item.id !== id); await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(next)); return next; }
export async function clearArchivedChats(): Promise<void> { await AsyncStorage.removeItem(ARCHIVE_KEY); }
