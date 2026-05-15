import { prisma } from "@/lib/prisma";
import {
  ContactMessageStatus,
  InquiryType,
  Prisma,
} from "@prisma/client";
import type { ContactMessageListQuery } from "@/lib/zod";

const userSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export type ContactMessageWithUser = {
  id: string;
  name: string;
  institution: string | null;
  email: string;
  inquiry: InquiryType;
  message: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ContactMessageCounts = {
  all: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
};

export async function findContactMessages(
  params: ContactMessageListQuery,
): Promise<{ data: ContactMessageWithUser[]; total: number }> {
  const { page, limit, status, inquiry, search } = params;

  const where: Prisma.ContactMessageWhereInput = {};

  if (status !== "ALL") {
    where.status = status as ContactMessageStatus;
  }

  if (inquiry !== "ALL") {
    where.inquiry = inquiry as InquiryType;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { institution: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { user: { select: userSelect } },
    }),
    prisma.contactMessage.count({ where }),
  ]);

  return { data, total };
}

export async function getContactMessageStatusCounts(): Promise<ContactMessageCounts> {
  const grouped = await prisma.contactMessage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const map: Partial<Record<ContactMessageStatus, number>> = {};
  for (const row of grouped) {
    map[row.status] = row._count._all;
  }

  const total = Object.values(map).reduce((sum, n) => sum + (n ?? 0), 0);

  return {
    all: total,
    new: map[ContactMessageStatus.NEW] ?? 0,
    read: map[ContactMessageStatus.READ] ?? 0,
    replied: map[ContactMessageStatus.REPLIED] ?? 0,
    archived: map[ContactMessageStatus.ARCHIVED] ?? 0,
  };
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<ContactMessageWithUser> {
  const record = await prisma.contactMessage.update({
    where: { id },
    data: { status },
    include: { user: { select: userSelect } },
  });
  return record;
}

export async function deleteContactMessageById(id: string): Promise<void> {
  await prisma.contactMessage.delete({ where: { id } });
}
