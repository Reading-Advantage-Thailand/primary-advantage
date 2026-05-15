"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Script from "next/script";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { contactFormSchema } from "@/lib/zod";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  onSuccess?: () => void;
  defaultEmail?: string;
  defaultName?: string;
  initialInquiry?: "sales" | "support" | "partnerships";
  initialName?: string;
  initialEmail?: string;
}

export function ContactForm({
  onSuccess,
  defaultEmail = "",
  defaultName = "",
  initialInquiry,
  initialName,
  initialEmail,
}: ContactFormProps) {
  const t = useTranslations("HomePage.contact");

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: initialName ?? defaultName,
      institution: "",
      email: initialEmail ?? defaultEmail,
      inquiry: initialInquiry,
      message: "",
      recaptchaToken: "dev-skip",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    try {
      // Generate reCAPTCHA v3 token before submitting
      let recaptchaToken = "dev-skip";
      if (RECAPTCHA_SITE_KEY && typeof window !== "undefined" && window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action: "contact_submit",
        });
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, recaptchaToken }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t("successTitle"), {
          description: t("successDescription"),
        });
        form.reset();
        onSuccess?.();
        return;
      }

      if (response.status === 400 && data?.details?.fieldErrors) {
        const fieldErrors = data.details.fieldErrors as Record<string, string[]>;
        for (const [field, errors] of Object.entries(fieldErrors)) {
          form.setError(field as keyof ContactFormValues, {
            type: "server",
            message: errors[0],
          });
        }
        return;
      }

      if (response.status === 403) {
        toast.error(t("errorTitle"), {
          description: t("recaptchaFailed"),
        });
        return;
      }

      if (response.status === 429) {
        toast.error(t("errorTitle"), {
          description: t("rateLimitDescription"),
        });
        return;
      }

      toast.error(t("errorTitle"), {
        description: t("errorDescription"),
      });
    } catch {
      toast.error(t("errorTitle"), {
        description: t("errorDescription"),
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <>
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="lazyOnload"
        />
      )}
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("namePlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("institution")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("institutionPlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inquiry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("inquiry")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("inquiryPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sales">
                    {t("inquiryOptions.sales")}
                  </SelectItem>
                  <SelectItem value="support">
                    {t("inquiryOptions.support")}
                  </SelectItem>
                  <SelectItem value="partnerships">
                    {t("inquiryOptions.partnerships")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("message")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("messagePlaceholder")}
                  className="h-32 resize-none"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
          ) : (
            t("sendMessage")
          )}
        </Button>

        <p className="text-muted-foreground text-xs text-center">
          {t.rich("recaptchaNotice", {
            privacy: (chunks) => (
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
            terms: (chunks) => (
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </form>
    </Form>
    </>
  );
}
