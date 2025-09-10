import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

const CreateLicenseSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  maxUsers: z.number().int().min(1).max(10000),
  startDate: z.string().datetime(),
  expiryDays: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "expired"]),
});

// export async function POST(request: NextRequest) {
//   try {
//     // Check authentication
//     const session = await auth();
//     if (!session || !session.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Check if user has admin or system role
//     const user = await prisma.user.findUnique({
//       where: { id: session.user.id },
//       select: { roles: true },
//     });

//     if (
//       !user ||
//       user.roles.some(
//         (role) => role.role.name !== "Admin" && role.role.name !== "System",
//       )
//     ) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     // Parse request body
//     const body = await request.json();
//     const validatedData = CreateLicenseSchema.parse(body);

//     // Generate unique license key
//     const licenseKey = `LIC-${randomBytes(6).toString("hex").toUpperCase()}`;

//     // Calculate expiry date if expiry days are provided
//     const startDate = new Date(validatedData.startDate);
//     let expiryDate: Date | null = null;

//     if (validatedData.expiryDays) {
//       expiryDate = new Date(startDate);
//       expiryDate.setDate(startDate.getDate() + validatedData.expiryDays);
//     }

//     // Create license in database
//     const license = await prisma.license.create({
//       data: {
//         key: licenseKey,
//         name: validatedData.name,
//         description: validatedData.description || null,
//         maxUsers: validatedData.maxUsers,
//         startDate: startDate,
//         expiryDate: expiryDate,
//         status: validatedData.status,
//       },
//     });

//     return NextResponse.json({
//       id: license.id,
//       key: license.key,
//       name: license.name,
//       description: license.description,
//       maxUsers: license.maxUsers,
//       startDate: license.startDate,
//       expiryDate: license.expiryDate,
//       status: license.status,
//       createdAt: license.createdAt,
//     });
//   } catch (error) {
//     console.error("Error creating license:", error);

//     if (error instanceof z.ZodError) {
//       return NextResponse.json(
//         { error: "Invalid input data", details: error.errors },
//         { status: 400 },
//       );
//     }

//     if (error instanceof Error && error.message.includes("Unique constraint")) {
//       return NextResponse.json(
//         { error: "License key already exists" },
//         { status: 409 },
//       );
//     }

//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     // Check authentication
//     const session = await auth();
//     if (!session || !session.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Check if user has admin or system role
//     const user = await prisma.user.findUnique({
//       where: { id: session.user.id },
//       select: { roles: true },
//     });

//     if (
//       !user ||
//       user.roles.some(
//         (role) => role.role.name !== "Admin" && role.role.name !== "System",
//       )
//     ) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     // Get query parameters for pagination and filtering
//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get("page") || "1");
//     const limit = parseInt(searchParams.get("limit") || "10");
//     const status = searchParams.get("status");
//     const search = searchParams.get("search");

//     const skip = (page - 1) * limit;

//     // Build where clause
//     const where: any = {};
//     if (status && ["active", "inactive", "expired"].includes(status)) {
//       where.status = status;
//     }
//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: "insensitive" } },
//         { description: { contains: search, mode: "insensitive" } },
//         { key: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     // Get licenses with pagination
//     const [licenses, total] = await Promise.all([
//       prisma.license.findMany({
//         where,
//         skip,
//         take: limit,
//         orderBy: { createdAt: "desc" },
//         include: {
//           School: {
//             select: {
//               name: true,
//               _count: {
//                 select: { users: true },
//               },
//             },
//           },
//         },
//       }),
//       prisma.license.count({ where }),
//     ]);

//     return NextResponse.json({
//       licenses,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching licenses:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
