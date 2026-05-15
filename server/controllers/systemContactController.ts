import { NextRequest, NextResponse } from "next/server";
import { contactMessageListQuerySchema, contactMessageStatusUpdateSchema } from "@/lib/zod";
import {
  findContactMessages,
  getContactMessageStatusCounts,
  updateContactMessageStatus,
  deleteContactMessageById,
} from "@/server/models/systemContactModel";
import { ContactMessageStatus } from "@prisma/client";

export async function listContactMessages(
  req: NextRequest,
): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = contactMessageListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsed.data;

  try {
    const [{ data, total }, counts] = await Promise.all([
      findContactMessages(query),
      getContactMessageStatusCounts(),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json(
      {
        data: data.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
        },
        counts,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("listContactMessages failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function updateContactMessageStatusController(
  req: NextRequest,
  id: string,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Validation failed", details: { _errors: ["Invalid JSON body"] } },
      { status: 400 },
    );
  }

  const parsed = contactMessageStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const record = await updateContactMessageStatus(
      id,
      parsed.data.status as ContactMessageStatus,
    );
    return NextResponse.json(
      {
        success: true,
        data: {
          ...record,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    // Prisma P2025: record not found
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Contact message not found" },
        { status: 404 },
      );
    }
    console.error("updateContactMessageStatus failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function deleteContactMessageController(
  _req: NextRequest,
  id: string,
): Promise<NextResponse> {
  try {
    await deleteContactMessageById(id);
    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Contact message not found" },
        { status: 404 },
      );
    }
    console.error("deleteContactMessage failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
