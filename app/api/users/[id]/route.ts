import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const UserId = (await params).id;
    const { name, email, role } = await request.json();

    const user = await prisma.user.update({
      where: { id: UserId },
      data: {
        name,
        email,
        role,
      },
    });

    return NextResponse.json(
      {
        message: "User Update successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error creating user",
      },
      {
        status: 500,
      },
    );
  }
}
