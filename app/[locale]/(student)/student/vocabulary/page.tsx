import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FlashcardDashboard from "@/components/flashcards/flashcard-dashboard";

export default async function VocabularyPage() {
  return (
    <Tabs defaultValue="flashcard">
      <TabsList className="grid h-fit w-full grid-cols-1 md:grid-cols-6">
        <TabsTrigger className="text-xs sm:text-sm" value="flashcard">
          Vocabulary Card
        </TabsTrigger>
      </TabsList>
      <TabsContent className="mt-4" value="flashcard">
        <FlashcardDashboard type="VOCABULARY" />
      </TabsContent>
    </Tabs>
  );
}
