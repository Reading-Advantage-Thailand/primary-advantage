import { OrderWordGame } from "@/components/pratice/order-words-game";
import { getFlashcardDeckId } from "@/actions/pratice";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

export default async function WordsOrderingPage() {
  const deckResult = await getFlashcardDeckId();

  if (!deckResult.success) {
    return (
      <div className="space-y-6">
        <Header
          heading="Order Words Game"
          text="Practice arranging words to form correct sentences from your flashcard articles!"
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

  return <OrderWordGame deckId={deckResult.deckId} />;
}
