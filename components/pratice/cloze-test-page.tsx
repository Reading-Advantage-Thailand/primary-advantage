import { ClozeTestGame } from "@/components/pratice/cloze-test-game";
import { getFlashcardDeckId } from "@/actions/pratice";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

export default async function ClozeTestPage() {
  const deckResult = await getFlashcardDeckId();

  if (!deckResult.success) {
    return (
      <div className="space-y-6">
        <Header
          heading="Cloze Test Game"
          text="Practice filling in missing words from your flashcard sentences!"
        />
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{deckResult.error}</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Start reading articles and saving sentences as flashcards to
              unlock this game!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ClozeTestGame deckId={deckResult.deckId} />;
}
