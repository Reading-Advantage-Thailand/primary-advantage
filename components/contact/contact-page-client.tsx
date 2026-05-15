"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  BriefcaseIcon,
  LifeBuoyIcon,
  HandshakeIcon,
  MailIcon,
  ClockIcon,
  CalendarIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContactForm } from "@/components/contact/contact-form";

type InquiryType = "sales" | "support" | "partnerships";

interface ChannelMessages {
  sales: { title: string; description: string; cta: string };
  support: { title: string; description: string; cta: string };
  partnerships: { title: string; description: string; cta: string };
}

interface ContactPageClientProps {
  channels: ChannelMessages;
  formTitle: string;
  formDescription: string;
  info: {
    emailLabel: string;
    emailValue: string;
    responseLabel: string;
    responseValue: string;
    hoursLabel: string;
    hoursValue: string;
  };
  faq: {
    title: string;
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
  };
}

const channelIcons = {
  sales: BriefcaseIcon,
  support: LifeBuoyIcon,
  partnerships: HandshakeIcon,
} as const;

const channelAccents: Record<InquiryType, string> = {
  sales: "from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/50",
  support: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/50",
  partnerships: "from-violet-500/10 to-violet-600/5 border-violet-500/20 hover:border-violet-500/50",
};

const iconColors: Record<InquiryType, string> = {
  sales: "text-blue-600 dark:text-blue-400",
  support: "text-emerald-600 dark:text-emerald-400",
  partnerships: "text-violet-600 dark:text-violet-400",
};

const VALID_INQUIRY_TYPES = ["sales", "support", "partnerships"] as const;

function sanitizeInquiry(value: string | null): InquiryType | undefined {
  if (value && (VALID_INQUIRY_TYPES as readonly string[]).includes(value)) {
    return value as InquiryType;
  }
  return undefined;
}

function sanitizeString(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 200) : undefined;
}

export function ContactPageClient({
  channels,
  formTitle,
  formDescription,
  info,
  faq,
}: ContactPageClientProps) {
  const searchParams = useSearchParams();
  const queryInquiry = sanitizeInquiry(searchParams.get("inquiry"));
  const queryName = sanitizeString(searchParams.get("name"));
  const queryEmail = sanitizeString(searchParams.get("email"));

  const [inquiry, setInquiry] = useState<InquiryType | undefined>(queryInquiry);
  const formRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Scroll to form on initial mount if inquiry was set via query param
  useEffect(() => {
    if (queryInquiry) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
    // Intentionally run only on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChannelClick = (type: InquiryType) => {
    setInquiry(type);
    // Defer scroll slightly so React can re-render first
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const faqs = [
    { q: faq.q1, a: faq.a1 },
    { q: faq.q2, a: faq.a2 },
    { q: faq.q3, a: faq.a3 },
  ];

  const channelKeys: InquiryType[] = ["sales", "support", "partnerships"];

  return (
    <>
      {/* Channel cards */}
      <section className="container mx-auto max-w-5xl px-4 py-12">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {channelKeys.map((key) => {
            const Icon = channelIcons[key];
            const ch = channels[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleChannelClick(key)}
                className={`group relative flex flex-col items-start rounded-2xl border bg-gradient-to-br p-6 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${channelAccents[key]}`}
                aria-label={`${ch.title} — ${ch.description}`}
              >
                <div className={`mb-4 rounded-xl bg-black/5 p-3 dark:bg-white/5 ${iconColors[key]}`}>
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">{ch.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{ch.description}</p>
                <span className={`mt-auto text-sm font-medium ${iconColors[key]} group-hover:underline`}>
                  {ch.cta} →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Form + info two-column section */}
      <section
        id="contact-form"
        ref={formRef}
        className="container mx-auto max-w-5xl scroll-mt-20 px-4 pb-16"
      >
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left: form (~60%) */}
          <div className="lg:w-[60%]">
            <Card className="border-border bg-card backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-card-foreground">{formTitle}</CardTitle>
                <CardDescription className="text-muted-foreground">{formDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {/*
                  key={inquiry ?? "__none"} forces a clean remount when the
                  inquiry changes so defaultValues take effect immediately.
                  This is intentional mock-grade behaviour — no setValue dance needed.
                */}
                <ContactForm
                  key={inquiry ?? "__none"}
                  initialInquiry={inquiry}
                  initialName={queryName}
                  initialEmail={queryEmail}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: contact info (~40%) */}
          <div className="flex flex-col gap-4 lg:w-[40%]">
            <Card className="border-border bg-card backdrop-blur-sm">
              <CardContent className="pt-6">
                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                      <MailIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {info.emailLabel}
                      </p>
                      <a
                        href={`mailto:${info.emailValue}`}
                        className="text-sm text-foreground hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                      >
                        {info.emailValue}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                      <ClockIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {info.responseLabel}
                      </p>
                      <p className="text-sm text-foreground">{info.responseValue}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
                      <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {info.hoursLabel}
                      </p>
                      <p className="text-sm text-foreground">{info.hoursValue}</p>
                    </div>
                  </li>
                </ul>

                <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    We serve schools across Thailand, Vietnam, and Southeast Asia. If you are
                    reaching out for a district-wide deployment, mention your school count in
                    the message and we will fast-track your inquiry.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto max-w-5xl px-4 pb-20">
        <h2 className="font-logo mb-6 text-2xl font-semibold text-foreground">{faq.title}</h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((item, idx) => (
            <div key={idx}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-expanded={openFaq === idx}
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <ChevronDownIcon
                  className={`ml-4 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
