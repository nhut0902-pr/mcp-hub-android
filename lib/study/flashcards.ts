import AsyncStorage from "@react-native-async-storage/async-storage";

const STUDY_DECKS_KEY = "mcp-hub.study-decks.v1";

export type StudyCard = { id: string; front: string; back: string; hint?: string; intervalDays: number; dueAt: number; reviewCount: number };
export type StudyDeck = { id: string; title: string; source: string; createdAt: number; updatedAt: number; cards: StudyCard[] };
export type ReviewRating = "again" | "good" | "easy";
export type FlashcardDraft = { front: string; back: string; hint?: string };

const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function parseFlashcardDrafts(value: string): { title?: string; cards: FlashcardDraft[] } | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const object = value.match(/\{[\s\S]*\}/)?.[0];
  const array = value.match(/\[[\s\S]*\]/)?.[0];
  const candidate = fenced ?? object ?? array;
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    const rawCards = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { cards?: unknown }).cards) ? (parsed as { cards: unknown[] }).cards : [];
    const cards = rawCards.slice(0, 30).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const card = item as Record<string, unknown>;
      const front = typeof card.front === "string" ? card.front.trim() : "";
      const back = typeof card.back === "string" ? card.back.trim() : "";
      const hint = typeof card.hint === "string" ? card.hint.trim() : undefined;
      return front && back ? [{ front, back, ...(hint ? { hint } : {}) }] : [];
    });
    const title = parsed && !Array.isArray(parsed) && typeof parsed === "object" && typeof (parsed as { title?: unknown }).title === "string" ? (parsed as { title: string }).title.trim() : undefined;
    return cards.length ? { title, cards } : null;
  } catch { return null; }
}

export function createStudyDeck(title: string, source: string, drafts: FlashcardDraft[], now = Date.now()): StudyDeck {
  return { id: nextId("deck"), title: title.trim() || "Bộ Flashcard mới", source: source.trim(), createdAt: now, updatedAt: now, cards: drafts.map((draft, index) => ({ id: `${nextId("card")}-${index}`, front: draft.front.trim(), back: draft.back.trim(), ...(draft.hint?.trim() ? { hint: draft.hint.trim() } : {}), intervalDays: 0, dueAt: now, reviewCount: 0 })) };
}

export function rateStudyCard(card: StudyCard, rating: ReviewRating, now = Date.now()): StudyCard {
  const intervalDays = rating === "again" ? 0 : rating === "good" ? Math.max(1, card.intervalDays + 1) : Math.max(2, (card.intervalDays || 1) * 2);
  const dueAt = rating === "again" ? now + 10 * 60 * 1000 : now + intervalDays * 24 * 60 * 60 * 1000;
  return { ...card, intervalDays, dueAt, reviewCount: card.reviewCount + 1 };
}

export function dueCards(deck: StudyDeck, now = Date.now()): StudyCard[] { return deck.cards.filter((card) => card.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt); }
export async function loadStudyDecks(): Promise<StudyDeck[]> { try { const raw = await AsyncStorage.getItem(STUDY_DECKS_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed as StudyDeck[] : []; } catch { return []; } }
export async function saveStudyDecks(decks: StudyDeck[]): Promise<void> { await AsyncStorage.setItem(STUDY_DECKS_KEY, JSON.stringify(decks)); }
export async function removeStudyDeck(id: string): Promise<StudyDeck[]> { const next = (await loadStudyDecks()).filter((deck) => deck.id !== id); await saveStudyDecks(next); return next; }
