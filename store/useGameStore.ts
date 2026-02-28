import { create } from "zustand";

export interface VocabularyItem {
  term: string;
  translation: string;
}

export type CastleId = "left" | "center" | "right";

export type Difficulty = "easy" | "normal" | "hard" | "extreme";

export const MAX_CASTLE_HP = 3;
export const DEFAULT_CASTLES: Record<CastleId, number> = {
  left: MAX_CASTLE_HP,
  center: MAX_CASTLE_HP,
  right: MAX_CASTLE_HP,
};

export interface GameState {
  vocabulary: VocabularyItem[];
  score: number;
  castles: Record<CastleId, number>;
  status: "idle" | "playing" | "game-over";
  correctAnswers: number;
  totalAttempts: number;
  lastXp: number;
  lastAccuracy: number;
  missedWords: VocabularyItem[];
  combo: number;
  maxCombo: number;
  mana: number;
  setVocabulary: (vocab: VocabularyItem[]) => void;
  resetGame: () => void;
  increaseScore: (amount: number) => void;
  damageCastle: (castleId: CastleId) => void;
  incrementAttempts: () => void;
  quitGame: () => void;
  setLastResult: (xp: number, accuracy: number) => void;
  addMissedWord: (word: VocabularyItem) => void;
  resetCombo: () => void;
  incrementCombo: () => void;
  addMana: (amount: number) => void;
  spendMana: (amount: number) => void;
  endGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  vocabulary: [],
  score: 0,
  castles: { ...DEFAULT_CASTLES },
  status: "idle",
  correctAnswers: 0,
  totalAttempts: 0,
  lastXp: 0,
  lastAccuracy: 0,
  missedWords: [],
  combo: 0,
  maxCombo: 0,
  mana: 0,
  setVocabulary: (vocab) => set({ vocabulary: vocab }),
  resetGame: () =>
    set({
      score: 0,
      castles: { ...DEFAULT_CASTLES },
      status: "playing",
      correctAnswers: 0,
      totalAttempts: 0,
      missedWords: [],
      combo: 0,
      maxCombo: 0,
      mana: 0,
    }),
  quitGame: () =>
    set({
      score: 0,
      castles: { ...DEFAULT_CASTLES },
      status: "idle",
      correctAnswers: 0,
      totalAttempts: 0,
      missedWords: [],
      combo: 0,
      maxCombo: 0,
      mana: 0,
    }),
  increaseScore: (amount) =>
    set((state) => ({
      score: state.score + amount,
      correctAnswers: state.correctAnswers + 1,
      totalAttempts: state.totalAttempts + 1,
    })),
  damageCastle: (castleId) =>
    set((state) => {
      const nextHp = Math.max(state.castles[castleId] - 1, 0);
      const nextCastles = {
        ...state.castles,
        [castleId]: nextHp,
      };
      const allDestroyed = Object.values(nextCastles).every((hp) => hp <= 0);
      return {
        castles: nextCastles,
        status: allDestroyed ? "game-over" : state.status,
      };
    }),
  incrementAttempts: () =>
    set((state) => ({ totalAttempts: state.totalAttempts + 1 })),
  setLastResult: (xp, accuracy) => set({ lastXp: xp, lastAccuracy: accuracy }),
  addMissedWord: (word) =>
    set((state) => ({ missedWords: [...state.missedWords, word] })),
  resetCombo: () => set({ combo: 0 }),
  incrementCombo: () =>
    set((state) => {
      const newCombo = state.combo + 1;
      return {
        combo: newCombo,
        maxCombo: Math.max(state.maxCombo, newCombo),
      };
    }),
  addMana: (amount) =>
    set((state) => ({ mana: Math.min(state.mana + amount, 100) })),
  spendMana: (amount) =>
    set((state) => ({ mana: Math.max(state.mana - amount, 0) })),
  endGame: () => set({ status: "game-over" }),
}));
