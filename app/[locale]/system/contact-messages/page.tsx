import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import ContactMessagesTable from "@/components/system/contact-messages-table";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  const t = await getTranslations("System.ContactMessages");
  return { title: t("title") };
}

export default async function ContactMessagesPage() {
  const t = await getTranslations("System.ContactMessages");

  return (
    <div>
      <Header heading={t("title")} text={t("description")} />
      <Separator className="my-4" />
      <ContactMessagesTable />
    </div>
  );
}
