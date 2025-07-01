import AudioTest from "./audio-test";
import AudioTestWord from "./audio-test-word";
// import FlashcardGame from "@/components/flashcards/flashcard-game";
// import { FlashcardType } from "@/types/enum";

export default async function TestFunctionality() {
  return (
    <div className="flex flex-col gap-4">
      <AudioTest />
      <AudioTestWord />
    </div>
  );
}
