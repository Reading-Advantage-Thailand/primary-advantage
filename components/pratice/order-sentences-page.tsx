import { OrderSentenceGame } from "@/components/pratice/order-sentences-game";
import { getFlashcardDeckId } from "@/actions/pratice";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";

export default async function SentencesOrderingPage() {
  const deckResult = await getFlashcardDeckId();

  if (!deckResult.success) {
    return (
      <div className="space-y-6">
        <Header
          heading="Order Sentences Game"
          text="Practice arranging sentences from your flashcard articles!"
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

  return <OrderSentenceGame deckId={deckResult.deckId} />;
}
