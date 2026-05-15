import { sendEmail } from "@/lib/email/resend";
import { renderContactNotificationEmail } from "@/lib/email/templates/contactNotification";
import { InquiryType } from "@prisma/client";

type ContactRecord = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  inquiry: InquiryType;
  message: string;
  createdAt: Date;
  userId: string | null;
};

export async function sendContactNotificationEmail(
  record: ContactRecord,
): Promise<void> {
  if (process.env.CONTACT_EMAIL_ENABLED !== "true") {
    console.info("Contact email sending is disabled (CONTACT_EMAIL_ENABLED != true) — skipping");
    return;
  }

  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.warn(
      "CONTACT_NOTIFY_EMAIL not configured — no notification sent",
    );
    return;
  }

  const appUrl =
    process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { subject, html, text } = renderContactNotificationEmail({
    id: record.id,
    name: record.name,
    email: record.email,
    institution: record.institution,
    inquiry: record.inquiry,
    message: record.message,
    createdAt: record.createdAt,
    isAuthenticatedUser: record.userId != null,
    appUrl,
  });

  const result = await sendEmail({
    to: notifyEmail,
    subject,
    html,
    text,
    replyTo: record.email,
  });

  if (!result.ok) {
    console.error(
      "Contact notification email failed to send:",
      result.reason,
    );
  }
}
