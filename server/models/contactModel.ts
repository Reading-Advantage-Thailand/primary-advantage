import { prisma } from "@/lib/prisma";
import { InquiryType } from "@prisma/client";
import type { ContactFormInput } from "@/lib/zod";

const inquiryMap: Record<ContactFormInput["inquiry"], InquiryType> = {
  sales: InquiryType.SALES,
  support: InquiryType.SUPPORT,
  partnerships: InquiryType.PARTNERSHIPS,
};

export type ContactMessageRecord = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  inquiry: InquiryType;
  message: string;
  createdAt: Date;
  userId: string | null;
};

export async function createContactMessage(
  input: ContactFormInput,
  userId?: string | null,
): Promise<ContactMessageRecord> {
  const record = await prisma.contactMessage.create({
    data: {
      name: input.name,
      institution: input.institution,
      email: input.email,
      inquiry: inquiryMap[input.inquiry],
      message: input.message,
      userId: userId ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      institution: true,
      inquiry: true,
      message: true,
      createdAt: true,
      userId: true,
    },
  });
  return record;
}
