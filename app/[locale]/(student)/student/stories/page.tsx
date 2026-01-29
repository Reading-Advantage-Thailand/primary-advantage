import { Header } from "@/components/header";
import StorieSelection from "@/components/stories/storie-selection";

export default async function StoriesPage() {
  return (
    <>
      <Header heading="Stories" />
      <StorieSelection />
    </>
  );
}
