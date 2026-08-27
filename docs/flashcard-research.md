# Flashcard research for MCP Hub

Two public repositories were reviewed as product and architecture references; no source code is copied from either repository.

| Repository | Observed approach | Integration decision |
| --- | --- | --- |
| [Domenico-Esposito/simple-flashcards](https://github.com/Domenico-Esposito/simple-flashcards) | Expo/React Native app with deck management, full-screen study cards, answer reveal, markdown support and progress statistics. | Use the interaction model: deck list → card session → reveal → self-rating; implement it in MCP Hub's own components. |
| [jekkilekki/reactnd-flashcards](https://github.com/jekkilekki/reactnd-flashcards) | MIT-licensed React Native/Expo app using AsyncStorage to persist decks and study state. | Store MCP Hub decks and review state in AsyncStorage; do not add accounts or remote storage. |

## Product decision

MCP Hub will provide an additive Flashcard screen. A user may enter source material or ask **Nhutbot 1.0 Flash** to generate a concise deck. Cards are saved locally, can be flipped, and are rated *Cần ôn lại*, *Ổn*, or *Đã thuộc*. The next review time is calculated locally; AI receives only the user-requested material and no provider credentials.

The AI Gia sư screen will remain separate from Flashcard. It will use a step-by-step teaching prompt, accept the existing chat/image workflow where available, and offer a one-tap handoff of a completed explanation into a generated deck.
