import { describe, expect, it } from "vitest";
import { createStudyDeck, dueCards, parseFlashcardDrafts, rateStudyCard } from "../lib/study/flashcards";

describe("Flashcard học cục bộ", () => {
  it("đọc JSON Flashcard AI có hàng rào markdown", () => {
    const result = parseFlashcardDrafts("```json\n{\"title\":\"Sinh học\",\"cards\":[{\"front\":\"DNA là gì?\",\"back\":\"Vật chất di truyền\"}]}\n```");
    expect(result?.title).toBe("Sinh học"); expect(result?.cards).toHaveLength(1);
  });
  it("tạo deck và lên lịch lại thẻ theo mức đánh giá", () => {
    const deck = createStudyDeck("Toán", "x", [{ front: "2 + 2", back: "4" }], 1_000); const card = rateStudyCard(deck.cards[0], "good", 2_000);
    expect(card.intervalDays).toBe(1); expect(card.dueAt).toBe(2_000 + 86_400_000); expect(dueCards(deck, 1_000)).toHaveLength(1);
  });
});
