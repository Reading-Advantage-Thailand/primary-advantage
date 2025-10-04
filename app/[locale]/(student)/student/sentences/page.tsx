import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";
import SentencesOrderingPage from "@/components/pratice/order-sentences-page";
import ClozeTestPage from "@/components/pratice/cloze-test-page";
import OrderWordPage from "@/components/pratice/order-words-page";
import ManageTab from "@/components/manage-tab";
import { getAllSentenceCards } from "@/actions/flashcard";
import MatchingGamePage from "@/components/pratice/matching-page";

export default async function SentencesPage() {
  const flashcardsResult = await getAllSentenceCards();

  return (
    <>
      <Tabs defaultValue="flashcard">
        <TabsList className="grid h-fit w-full grid-cols-1 md:grid-cols-6">
          <TabsTrigger value="flashcard" className="text-xs sm:text-sm">
            Sentence Card
          </TabsTrigger>
          <TabsTrigger value="orderSentence" className="text-xs sm:text-sm">
            Order Sentence
          </TabsTrigger>
          <TabsTrigger value="clozeTest" className="text-xs sm:text-sm">
            Cloze Test
          </TabsTrigger>
          <TabsTrigger value="orderWord" className="text-xs sm:text-sm">
            Order Word
          </TabsTrigger>
          <TabsTrigger value="matching" className="text-xs sm:text-sm">
            Matching
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-xs sm:text-sm">
            Manage
          </TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4" value="flashcard">
          <FlashcardDashboard type="SENTENCE" />
        </TabsContent>
        <TabsContent className="mt-4" value="orderSentence">
          <SentencesOrderingPage />
        </TabsContent>
        <TabsContent className="mt-4" value="clozeTest">
          <ClozeTestPage />
        </TabsContent>
        <TabsContent className="mt-4" value="orderWord">
          <OrderWordPage />
        </TabsContent>
        <TabsContent className="mt-4" value="matching">
          <MatchingGamePage />
        </TabsContent>
        <TabsContent className="mt-4" value="manage">
          <ManageTab data={flashcardsResult.cards || []} />
        </TabsContent>
      </Tabs>
    </>
  );
}
