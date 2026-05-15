import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactPageClient } from "@/components/contact/contact-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section>
        <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16 text-center">
          <h1 className="font-logo animate-glow mb-4 text-4xl text-foreground sm:text-5xl md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="font-logo text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed sm:text-xl">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <ContactPageClient
        channels={{
          sales: {
            title: t("channels.sales.title"),
            description: t("channels.sales.description"),
            cta: t("channels.sales.cta"),
          },
          support: {
            title: t("channels.support.title"),
            description: t("channels.support.description"),
            cta: t("channels.support.cta"),
          },
          partnerships: {
            title: t("channels.partnerships.title"),
            description: t("channels.partnerships.description"),
            cta: t("channels.partnerships.cta"),
          },
        }}
        formTitle={t("form.title")}
        formDescription={t("form.description")}
        info={{
          emailLabel: t("info.emailLabel"),
          emailValue: t("info.emailValue"),
          responseLabel: t("info.responseLabel"),
          responseValue: t("info.responseValue"),
          hoursLabel: t("info.hoursLabel"),
          hoursValue: t("info.hoursValue"),
        }}
        faq={{
          title: t("faq.title"),
          q1: t("faq.q1"),
          a1: t("faq.a1"),
          q2: t("faq.q2"),
          a2: t("faq.a2"),
          q3: t("faq.q3"),
          a3: t("faq.a3"),
        }}
      />
    </div>
  );
}
