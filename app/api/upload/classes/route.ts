import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync, unlink } from "fs";
import path from "path";
import os from "os";
import { parse } from "csv/sync";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateRandomClassCode } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
// Zod validation schemas
const classroomCsvRowSchema = z.object({
  classroom_name: z
    .string()
    .min(1, "Classroom name is required")
    .max(100, "Classroom name too long")
    .trim()
    .refine((val) => val.length > 0, "Classroom name cannot be empty")
    .refine(
      (val) => /^[\p{L}\p{M}\p{N}\s\-\/_().,]+$/u.test(val),
      "Classroom name can only contain letters, numbers, spaces, hyphens, underscores, parentheses, periods, commas, and slashes",
    ),
});

const userCsvRowSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .trim()
    .refine((val) => val.length > 0, "Name cannot be empty")
    .refine(
      (val) => /^[\p{L}\p{M}\s\-']+$/u.test(val),
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    ),
  email: z.email("Invalid email format").toLowerCase().trim(),
  classroom_name: z
    .string()
    .min(1, "Classroom name is required")
    .max(500, "Classroom names too long (max 500 characters)")
    .trim()
    .refine(
      (val) => /^[\p{L}\p{M}\p{N}\s\-\/_(),.]+$/u.test(val),
      "Classroom names can only contain letters, numbers, spaces, hyphens, underscores, parentheses, and commas",
    ),
  role: z.enum(["student", "teacher", "admin"], {
    error: () => "Role must be Student, Teacher, or Admin",
  }),
});

// CSV file validation schema
const csvFileSchema = z.object({
  name: z
    .string()
    .refine(
      (name) =>
        ["classes.csv", "students.csv", "teachers.csv"].includes(
          name.toLowerCase(),
        ),
      "Only classes.csv or students.csv or teachers.csv files are allowed",
    ),
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z
    .string()
    .refine(
      (type) => type === "text/csv" || type === "application/csv",
      "Only CSV files are allowed",
    ),
});

const validRoles = ["student", "teacher", "admin"];

// Role validation helper
const isValidRole = (role: string): role is "student" | "teacher" | "admin" => {
  return validRoles.includes(role as any);
};

// Helper function to parse and validate multiple classroom names
const parseClassroomNames = (classroomNames: string): string[] => {
  return classroomNames
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
};

// Helper function to validate individual classroom name format
const validateClassroomNameFormat = (className: string): boolean => {
  return /^[\p{L}\p{M}\p{N}\s\-\/_(),.]+$/u.test(className);
};

// Helper function to classify classroom names for students/teachers import.
// Returns:
//   exists   — name found exactly once in the school (safe to assign)
//   missing  — name not found (will be auto-created)
//   ambiguous — name found 2+ times in the school (caller must reject the row)
const classifyClassroomNames = async (
  classroomNames: string[],
  schoolId: string | null,
): Promise<{ exists: string[]; missing: string[]; ambiguous: string[] }> => {
  if (classroomNames.length === 0) {
    return { exists: [], missing: [], ambiguous: [] };
  }

  // Fetch all matching classrooms — intentionally not distinct so duplicates show up
  const existingClassrooms = await prisma.classroom.findMany({
    where: {
      name: { in: classroomNames },
      schoolId: schoolId,
    },
    select: { name: true },
  });

  // Count occurrences per name
  const countByName = new Map<string, number>();
  for (const { name } of existingClassrooms) {
    countByName.set(name, (countByName.get(name) ?? 0) + 1);
  }

  const exists: string[] = [];
  const missing: string[] = [];
  const ambiguous: string[] = [];

  for (const className of classroomNames) {
    const count = countByName.get(className) ?? 0;
    if (count === 0) {
      missing.push(className);
    } else if (count === 1) {
      exists.push(className);
    } else {
      ambiguous.push(className);
    }
  }

  return { exists, missing, ambiguous };
};

// ---------------------------------------------------------------------------
// Suffix-name helpers for classroom conflict resolution
// ---------------------------------------------------------------------------

/**
 * Parse the numeric suffix N from "<baseName> (N)".
 * Returns null if the string is not a suffixed variant of baseName.
 */
const parseSuffixN = (baseName: string, candidate: string): number | null => {
  const escaped = baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escaped} \\((\\d+)\\)$`).exec(candidate);
  if (!match) return null;
  return parseInt(match[1], 10);
};

/**
 * Find the next available suffix name for <baseName> in the given school.
 * Fetches all classrooms whose name starts with baseName, extracts existing
 * suffix numbers (treating bare baseName as N=1), then returns
 * "<baseName> (maxN + 1)".
 */
const computeSuffixedName = async (
  baseName: string,
  schoolId: string | null,
): Promise<string> => {
  // Use startsWith to get all candidates in one query
  const candidates = await prisma.classroom.findMany({
    where: {
      schoolId,
      name: { startsWith: baseName },
    },
    select: { name: true },
  });

  let maxN = 1; // bare baseName counts as N=1

  for (const { name } of candidates) {
    if (name === baseName) {
      // bare match — already counted as 1
      continue;
    }
    const n = parseSuffixN(baseName, name);
    if (n !== null && n > maxN) {
      maxN = n;
    }
  }

  return `${baseName} (${maxN + 1})`;
};

// Timing utility
const createTimer = (label: string) => {
  const startTime = Date.now();
  return {
    log: (operation: string, additionalData?: any) => {
      const elapsed = Date.now() - startTime;
      console.log(
        `⏱️  [${label}] ${operation}: ${elapsed}ms`,
        additionalData || "",
      );
    },
    end: (totalOperation?: string) => {
      const elapsed = Date.now() - startTime;
      console.log(`🏁 [${label}] ${totalOperation || "Total"}: ${elapsed}ms`);
      return elapsed;
    },
  };
};

export async function POST(request: NextRequest) {
  const apiTimer = createTimer("UPLOAD_CLASSES_API");
  console.log("🚀 Starting upload classes API request");

  try {
    const authTimer = createTimer("AUTH_CHECK");
    const user = await getCurrentUser();
    authTimer.log("Session validation completed");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user with school information
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        School: true,
      },
    });
    authTimer.log("User data fetched");

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has permission to upload (Admin, System, or Teacher roles)
    const currentUserRoles = currentUser.role;
    const allowedRoles = ["admin", "system", "teacher"];
    const hasPermission = allowedRoles.includes(currentUserRoles as string);

    if (!hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions",
          details: [
            "Only Admin, System, or Teacher roles can upload classes CSV files",
          ],
          userRoles: currentUserRoles,
        },
        { status: 403 },
      );
    }

    // For non-system users, require school association
    if (currentUserRoles !== "system" && !currentUser.schoolId) {
      return NextResponse.json(
        {
          error: "School association required",
          details: [
            "Users must be associated with a school to upload classes CSV files",
          ],
        },
        { status: 400 },
      );
    }
    authTimer.end("Authentication and permission checks completed");

    const fileTimer = createTimer("FILE_PROCESSING");
    const formData = await request.formData();
    const file = formData.get("file") as File;
    fileTimer.log("Form data extracted");

    // Resolve the effective schoolId:
    // - system admin: required from request body; validated against DB
    // - admin/teacher: always use their own schoolId (ignore any client-supplied value)
    let effectiveSchoolId: string | null = currentUser.schoolId;
    if (currentUserRoles === "system") {
      const clientSchoolId = formData.get("schoolId");
      if (!clientSchoolId || typeof clientSchoolId !== "string" || clientSchoolId.trim() === "") {
        return NextResponse.json(
          {
            error: "schoolId is required for system administrators",
            details: ["Please specify the target school for this import."],
          },
          { status: 400 },
        );
      }
      const targetSchool = await prisma.school.findUnique({
        where: { id: clientSchoolId.trim() },
        select: { id: true },
      });
      if (!targetSchool) {
        return NextResponse.json(
          {
            error: "School not found",
            details: [`No school exists with id '${clientSchoolId.trim()}'.`],
          },
          { status: 400 },
        );
      }
      effectiveSchoolId = targetSchool.id;
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file using Zod schema
    try {
      csvFileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      fileTimer.log(
        "File validation completed",
        `File: ${file.name}, Size: ${file.size} bytes`,
      );
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errorDetails = validationError.issues.map((err) => err.message);
        return NextResponse.json(
          {
            error: errorDetails,
            details: errorDetails,
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "File validation failed" },
        { status: 400 },
      );
    }

    const filename = file.name.toLowerCase();

    // Create temp directory if it doesn't exist
    const tempDir = path.join(os.tmpdir(), "pa-uploads");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${currentUser.id}_${originalName}`;
    const filePath = path.join(tempDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    fileTimer.log("File saved to temp directory", `Path: ${filePath}`);

    // Parse CSV file
    const parseTimer = createTimer("CSV_PARSING");
    let csvData: any[];
    try {
      csvData = parse(buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true, // Trim whitespace from values
        skip_records_with_empty_values: true, // Skip rows with empty values
      });
      parseTimer.log("CSV parsing completed", `Rows: ${csvData.length}`);

      // Validate that we have data
      if (!Array.isArray(csvData) || csvData.length === 0) {
        return NextResponse.json(
          {
            error: "Invalid CSV content",
            details: ["CSV file must contain at least one data row"],
          },
          { status: 400 },
        );
      }

      // Validate row count limits
      const maxRows = 1000; // Maximum 1000 rows per upload
      if (csvData.length > maxRows) {
        return NextResponse.json(
          {
            error: "CSV too large",
            details: [
              `Maximum ${maxRows} rows allowed. Got ${csvData.length} rows.`,
            ],
          },
          { status: 400 },
        );
      }
      parseTimer.end("CSV validation completed");
    } catch (parseError) {
      console.error("CSV parsing failed", parseError);
      return NextResponse.json(
        {
          error: "CSV parsing failed",
          details: [
            "Unable to parse CSV file. Please ensure it's a valid CSV format.",
          ],
        },
        { status: 400 },
      );
    }

    // Validate CSV headers with Zod
    if (csvData.length > 0) {
      const firstRow = csvData[0];
      const headers = Object.keys(firstRow);

      // Define expected headers for each file type
      const expectedHeadersClasses = ["classroom_name"];
      const expectedHeadersUsers = ["name", "email", "classroom_name", "role"];

      let expectedHeaders: string[] = [];
      let headerSchema: z.ZodType;

      if (filename === "students.csv" || filename === "teachers.csv") {
        expectedHeaders = expectedHeadersUsers;
      } else if (filename === "classes.csv") {
        expectedHeaders = expectedHeadersClasses;
      }

      // Validate headers exist and match expected format
      if (
        headers.length !== expectedHeaders.length ||
        !expectedHeaders.every((header) => headers.includes(header))
      ) {
        return NextResponse.json(
          {
            error: "Invalid CSV format",
            details: [
              `Expected exactly ${expectedHeaders.length} headers: ${expectedHeaders.join(", ")}. Got: ${headers.join(", ")}`,
            ],
            expectedFormat: expectedHeaders.join(","),
          },
          { status: 400 },
        );
      }
    }

    // Validate and process CSV data
    const validationTimer = createTimer("DATA_VALIDATION");
    const processedClasses: any[] = [];
    const processedUsers: any[] = [];
    const errors: string[] = [];
    // Classroom names that need auto-creation (populated in students/teachers validation pass)
    let missingClassroomSet = new Set<string>();

    if (filename === "students.csv" || filename === "teachers.csv") {
      console.log("📊 Starting users CSV validation and processing...");

      // Pre-process and validate all rows first
      const validatedRows: Array<{
        row: any;
        rowNumber: number;
        validatedData?: any;
        error?: string;
      }> = [];

      // First pass: Zod validation and basic format checks
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header

        try {
          const validatedRow = userCsvRowSchema.parse(row);
          validatedRows.push({ row, rowNumber, validatedData: validatedRow });
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const errorMessage = validationError.issues
              .map((err) => err.message)
              .join("; ");
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: ${errorMessage}`,
            });
          } else {
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: Validation failed`,
            });
          }
          continue;
        }
      }

      // Check for duplicate emails within the current upload (O(n²) but only once)
      const emailSet = new Set<string>();
      for (const item of validatedRows) {
        if (item.validatedData) {
          const email = item.validatedData.email.toLowerCase();
          if (emailSet.has(email)) {
            item.error = `Row ${item.rowNumber}: Duplicate email '${item.validatedData.email}' within the same upload`;
            item.validatedData = undefined;
          } else {
            emailSet.add(email);
          }
        }
      }

      // Batch check existing users in database (single query instead of N queries)
      const validEmails = validatedRows
        .filter((item) => item.validatedData && !item.error)
        .map((item) => item.validatedData!.email.toLowerCase());

      let existingUsers: Array<{ email: string | null }> = [];
      if (validEmails.length > 0) {
        existingUsers = await prisma.user.findMany({
          where: { email: { in: validEmails } },
          select: { email: true },
        });
      }

      const existingEmailSet = new Set(
        existingUsers
          .filter((u) => u.email !== null)
          .map((u) => u.email!.toLowerCase()),
      );

      // Collect all unique classroom names for batch validation
      const allClassroomNames = new Set<string>();
      for (const item of validatedRows) {
        if (
          item.validatedData &&
          !item.error &&
          item.validatedData.role !== "admin"
        ) {
          const classroomNames = parseClassroomNames(
            item.validatedData.classroom_name,
          );
          for (const name of classroomNames) {
            allClassroomNames.add(name);
          }
        }
      }

      // Classify all classroom names: exists (1 match), missing (0 → auto-create), ambiguous (2+ → reject row)
      let classroomClassification: { exists: string[]; missing: string[]; ambiguous: string[] } = {
        exists: [],
        missing: [],
        ambiguous: [],
      };
      if (allClassroomNames.size > 0) {
        classroomClassification = await classifyClassroomNames(
          Array.from(allClassroomNames),
          effectiveSchoolId,
        );
      }

      const existingClassroomSet = new Set(classroomClassification.exists);
      missingClassroomSet = new Set(classroomClassification.missing);
      const ambiguousClassroomSet = new Set(classroomClassification.ambiguous);

      // Second pass: Process validated rows and apply business logic
      for (const item of validatedRows) {
        if (item.error || !item.validatedData) {
          errors.push(item.error!);
          continue;
        }

        const validatedRow = item.validatedData;
        const rowNumber = item.rowNumber;

        // Check if user already exists in database
        if (existingEmailSet.has(validatedRow.email.toLowerCase())) {
          errors.push(
            `Row ${rowNumber}: User with email '${validatedRow.email}' already exists`,
          );
          continue;
        }

        // Parse and validate classroom names for non-Admin roles
        if (validatedRow.role !== "admin") {
          const classroomNames = parseClassroomNames(
            validatedRow.classroom_name,
          );

          if (classroomNames.length === 0) {
            errors.push(
              `Row ${rowNumber}: At least one valid classroom name is required for ${validatedRow.role} role`,
            );
            continue;
          }

          // Validate maximum number of classroom assignments per user
          const maxClassroomsPerUser = 10;
          if (classroomNames.length > maxClassroomsPerUser) {
            errors.push(
              `Row ${rowNumber}: Too many classroom assignments. Maximum ${maxClassroomsPerUser} classrooms allowed per user. Got ${classroomNames.length} classrooms.`,
            );
            continue;
          }

          // Validate individual classroom name formats and lengths
          const invalidFormats = classroomNames.filter(
            (name) => !validateClassroomNameFormat(name),
          );
          if (invalidFormats.length > 0) {
            errors.push(
              `Row ${rowNumber}: Invalid classroom name format(s): ${invalidFormats.join(", ")}. Classroom names can only contain letters, numbers, spaces, hyphens, underscores, and parentheses.`,
            );
            continue;
          }

          // Validate individual classroom name lengths
          const tooLongNames = classroomNames.filter(
            (name) => name.length > 50,
          );
          if (tooLongNames.length > 0) {
            errors.push(
              `Row ${rowNumber}: Classroom name(s) too long: ${tooLongNames.join(", ")}. Maximum 50 characters per classroom name.`,
            );
            continue;
          }

          // Check for duplicate classroom names within the same user assignment
          const uniqueClassrooms = new Set(
            classroomNames.map((name) => name.toLowerCase()),
          );
          if (uniqueClassrooms.size !== classroomNames.length) {
            errors.push(
              `Row ${rowNumber}: Duplicate classroom names found in the same assignment. Please remove duplicates.`,
            );
            continue;
          }

          // Reject row if any referenced classroom name is ambiguous (2+ matches in school)
          const ambiguousClassrooms = classroomNames.filter((name) =>
            ambiguousClassroomSet.has(name),
          );
          if (ambiguousClassrooms.length > 0) {
            for (const name of ambiguousClassrooms) {
              errors.push(
                `Row ${rowNumber}: Ambiguous classroom name "${name}" matches multiple classrooms in your school. Please consolidate or rename them before importing.`,
              );
            }
            continue;
          }
          // Names in missingClassroomSet will be auto-created before user assignment (no rejection)
        }

        // Prepare user data with default values and school assignment
        const userData = {
          email: validatedRow.email.toLowerCase().trim(),
          name: validatedRow.name.trim(),
          password: null,
          role: validatedRow.role, // carry the CSV role through to user creation
          schoolId: effectiveSchoolId,
          classroomNames:
            validatedRow.role !== "admin"
              ? parseClassroomNames(validatedRow.classroom_name)
              : [],
        };

        processedUsers.push(userData);
      }

      validationTimer.log(
        "Users validation completed",
        `Processed: ${processedUsers.length}, Errors: ${errors.length}`,
      );
    }
    if (filename === "classes.csv") {
      console.log("🏫 Starting classes CSV validation and processing...");

      // ------------------------------------------------------------------
      // Step 1: Row-level Zod validation + dedup within upload
      // ------------------------------------------------------------------
      const validatedRows: Array<{
        row: any;
        rowNumber: number;
        validatedData?: any;
        error?: string;
      }> = [];

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2;

        try {
          const validatedRow = classroomCsvRowSchema.parse(row);
          validatedRows.push({ row, rowNumber, validatedData: validatedRow });
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const errorMessage = validationError.issues
              .map((err) => err.message)
              .join("; ");
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: ${errorMessage}`,
            });
          } else {
            validatedRows.push({
              row,
              rowNumber,
              error: `Row ${rowNumber}: Validation failed`,
            });
          }
          continue;
        }
      }

      // Dedup within the upload (case-insensitive)
      const uploadNameSet = new Set<string>();
      for (const item of validatedRows) {
        if (item.validatedData) {
          const key = item.validatedData.classroom_name.trim().toLowerCase();
          if (uploadNameSet.has(key)) {
            item.error = `Row ${item.rowNumber}: Duplicate classroom name '${item.validatedData.classroom_name.trim()}' within the same upload`;
            item.validatedData = undefined;
          } else {
            uploadNameSet.add(key);
          }
        }
      }

      // Collect row-level format errors
      for (const item of validatedRows) {
        if (item.error || !item.validatedData) {
          errors.push(item.error!);
        }
      }

      if (errors.length > 0) {
        // Format errors — bail out before any DB work
        unlink(filePath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
        return NextResponse.json(
          {
            error: "Validation failed",
            details: errors,
            validatedRows: 0,
            totalRows: csvData.length,
          },
          { status: 400 },
        );
      }

      // ------------------------------------------------------------------
      // Step 2: Preflight — split names into matching vs missing
      // ------------------------------------------------------------------
      const parsedNames = validatedRows
        .filter((item) => item.validatedData)
        .map((item) => item.validatedData!.classroom_name.trim() as string);

      // Parse choices from request (JSON string)
      let choices: Record<string, "existing" | "new"> = {};
      const rawChoices = formData.get("choices");
      if (rawChoices && typeof rawChoices === "string") {
        try {
          const parsed = JSON.parse(rawChoices);
          // Only keep valid entries
          for (const [k, v] of Object.entries(parsed)) {
            if (v === "existing" || v === "new") {
              choices[k] = v;
            }
          }
        } catch {
          return NextResponse.json(
            { error: "Invalid choices format", details: ["choices must be a valid JSON string"] },
            { status: 400 },
          );
        }
      }

      // Fetch existing classrooms matching these names (exact match)
      const existingClassrooms = await prisma.classroom.findMany({
        where: {
          name: { in: parsedNames },
          schoolId: effectiveSchoolId,
        },
        select: { id: true, name: true, grade: true },
      });

      const existingByName = new Map(
        existingClassrooms.map((c) => [c.name, c]),
      );

      const matchingNames = parsedNames.filter((n) => existingByName.has(n));
      const missingNames = parsedNames.filter((n) => !existingByName.has(n));

      // Determine which matching names are not yet covered by choices
      const uncoveredConflicts = matchingNames.filter((n) => !choices[n]);

      if (uncoveredConflicts.length > 0) {
        // 409 — return conflict list; do NOT write anything
        unlink(filePath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
        return NextResponse.json(
          {
            error: "Classroom name conflicts",
            conflicts: uncoveredConflicts.map((name) => {
              const existing = existingByName.get(name)!;
              return {
                name,
                existingId: existing.id,
                existingMeta: { grade: existing.grade ?? null },
              };
            }),
            canResolve: true,
            summary: {
              newClassroomsToCreate: missingNames,
              parsedRows: parsedNames.length,
            },
          },
          { status: 409 },
        );
      }

      // ------------------------------------------------------------------
      // Step 3: Apply — build the work list, then execute in a transaction
      // ------------------------------------------------------------------
      // classesResult is built inside the transaction and surfaced after
      type ClassroomResult = {
        name: string;
        id: string;
        wasSuffixed: boolean;
        originalName?: string;
      };

      // Gather suffix names BEFORE the transaction (reads only, safe outside)
      const suffixNameMap = new Map<string, string>(); // originalName → suffixedName
      for (const name of matchingNames) {
        if (choices[name] === "new") {
          const suffixed = await computeSuffixedName(name, effectiveSchoolId);
          suffixNameMap.set(name, suffixed);
        }
      }

      const classroomResults: ClassroomResult[] = await prisma.$transaction(
        async (tx) => {
          const results: ClassroomResult[] = [];

          // Auto-create missing classrooms
          for (const name of missingNames) {
            const created = await tx.classroom.create({
              data: {
                name,
                classCode: generateRandomClassCode(),
                schoolId: effectiveSchoolId,
              },
              select: { id: true, name: true },
            });
            results.push({ name: created.name, id: created.id, wasSuffixed: false });
          }

          // Resolve matching classrooms
          for (const name of matchingNames) {
            const choice = choices[name];
            if (choice === "existing") {
              const existing = existingByName.get(name)!;
              results.push({
                name: existing.name,
                id: existing.id,
                wasSuffixed: false,
              });
            } else if (choice === "new") {
              const suffixedName = suffixNameMap.get(name)!;
              const created = await tx.classroom.create({
                data: {
                  name: suffixedName,
                  classCode: generateRandomClassCode(),
                  schoolId: effectiveSchoolId,
                },
                select: { id: true, name: true },
              });
              results.push({
                name: created.name,
                id: created.id,
                wasSuffixed: true,
                originalName: name,
              });
            }
          }

          return results;
        },
      );

      validationTimer.log(
        "Classes validation + apply completed",
        `Created/resolved: ${classroomResults.length}`,
      );

      // Skip the remaining generic validation error check — we already handled all early exits
      unlink(filePath, (err) => {
        if (err) console.error("Error deleting temp file:", err);
      });

      const totalTime = apiTimer.end("Upload classes API request completed");
      return NextResponse.json({
        success: true,
        message: "Classes uploaded and created successfully",
        stats: {
          totalRows: csvData.length,
          errors: 0,
          processedClasses: parsedNames.length,
          createdClassrooms: classroomResults.length,
        },
        createdClassrooms: classroomResults,
        performanceStats: {
          totalExecutionTime: totalTime,
          processedAt: new Date().toISOString(),
        },
        schoolInfo: effectiveSchoolId
          ? { id: effectiveSchoolId, note: "All imported classes have been assigned to this school" }
          : { note: "system user - data imported without school assignment" },
        note: "Classes created successfully. You can now import students and teachers to assign them to these classes.",
      });
    }
    validationTimer.end("Data validation and processing completed");
    console.log("errors: ", errors);

    // If there are validation errors, return them
    if (errors.length > 0) {
      unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting temp file:", err);
        }
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validatedRows: processedClasses.length,
          totalRows: csvData.length,
        },
        { status: 400 },
      );
    }

    // Create classrooms in batches
    const dbTimer = createTimer("DATABASE_OPERATIONS");
    const max = 1000;
    let batch: any[] = [];
    let createdClassrooms: any[] = [];

    // Variables for user processing statistics
    let createdUsers: any[] = [];
    let roleAssignments: any[] = [];
    let classroomsAssigned = 0;
    let studentAssignments = 0;
    let teacherAssignments = 0;

    if (filename === "students.csv" || filename === "teachers.csv") {
      console.log("👥 Starting user creation and assignment processes...");
      // Get all roles from database
      const roles = await prisma.role.findMany();
      const roleMap = new Map(roles.map((role) => [role.name, role.id]));
      dbTimer.log(
        "Roles fetched from database",
        `Roles count: ${roles.length}`,
      );

      // Process users in batches
      batch = []; // Reset batch for user processing

      for (const userData of processedUsers) {
        batch.push({
          email: userData.email,
          name: userData.name,
          password: userData.password,
          role: userData.role, // set role from CSV — not the schema default "user"
          roleId: roleMap.get(userData.role) ?? null, // FK to Role table; null if role not found
          cefrLevel: "A0-", // Default CEFR level
          level: 1, // Default level
          xp: 0, // Default XP
          schoolId: userData.schoolId,
        });

        if (batch.length >= max) {
          // Create users in batches
          const batchTimer = createTimer("USER_BATCH_CREATE");
          await prisma.user.createMany({
            data: batch,
            skipDuplicates: true, // Skip users with duplicate emails
          });
          batchTimer.log("User batch created", `Batch size: ${batch.length}`);

          // Get the created users to assign roles and classrooms
          const emails = batch.map((u) => u.email);
          const users = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true },
          });
          createdUsers.push(...users);
          batchTimer.end("User batch processing completed");
          batch = [];
        }
      }

      // Process remaining batch
      if (batch.length > 0) {
        const finalBatchTimer = createTimer("FINAL_USER_BATCH");
        await prisma.user.createMany({
          data: batch,
          skipDuplicates: true,
        });

        // Get the created users to assign roles and classrooms
        const emails = batch.map((u) => u.email);
        const users = await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        });
        createdUsers.push(...users);
        finalBatchTimer.end("Final user batch completed");
      }
      dbTimer.log("All users created", `Total users: ${createdUsers.length}`);

      // Create user-email to user-id mapping
      const emailToUserId = new Map(
        createdUsers.map((user) => [user.email, user.id]),
      );

      // Assign roles to users - optimized with pre-built role map
      roleAssignments = [];

      // Pre-build CSV role map for O(n) lookup instead of O(n²)
      const csvRoleMap = new Map<string, string>();
      for (const row of csvData) {
        csvRoleMap.set(row.email.toLowerCase().trim(), row.role?.trim());
      }

      for (const userData of processedUsers) {
        const userId = emailToUserId.get(userData.email);
        const roleName = csvRoleMap.get(userData.email);
        const roleId = roleName ? roleMap.get(roleName) : undefined;

        if (userId && roleId) {
          roleAssignments.push({ userId, roleId });
        }
      }

      // Handle classroom assignments for non-Admin roles
      const classroomTimer = createTimer("CLASSROOM_ASSIGNMENTS");
      classroomsAssigned = 0;
      studentAssignments = 0;
      teacherAssignments = 0;

      console.log("🎓 Starting classroom assignments...");

      // Pre-process data for better performance
      const userRoleMap = new Map<string, string>();
      const classroomNameToIdMap = new Map<string, string>();
      const uniqueClassroomNames = new Set<string>();

      // Build user role map from CSV data (O(n) instead of O(n²))
      for (const row of csvData) {
        userRoleMap.set(row.email.toLowerCase().trim(), row.role?.trim());
      }

      // Collect all unique classroom names and build classroom ID map
      for (const userData of processedUsers) {
        for (const className of userData.classroomNames) {
          uniqueClassroomNames.add(className);
        }
      }

      // Auto-create classrooms that were classified as missing during validation
      // (missingClassroomSet was built in the validation pass above)
      const namesToAutoCreate = Array.from(uniqueClassroomNames).filter((n) =>
        missingClassroomSet.has(n),
      );
      if (namesToAutoCreate.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const name of namesToAutoCreate) {
            await tx.classroom.create({
              data: {
                name,
                classCode: generateRandomClassCode(),
                schoolId: effectiveSchoolId,
              },
            });
          }
        });
        dbTimer.log("Auto-created missing classrooms", `Count: ${namesToAutoCreate.length}`);
      }

      // Batch fetch all classrooms at once (includes freshly auto-created ones)
      if (uniqueClassroomNames.size > 0) {
        const classrooms = await prisma.classroom.findMany({
          where: {
            name: { in: Array.from(uniqueClassroomNames) },
            schoolId: effectiveSchoolId,
          },
          select: { id: true, name: true },
        });

        for (const classroom of classrooms) {
          classroomNameToIdMap.set(classroom.name, classroom.id);
        }
      }

      // Prepare batch operations
      const studentAssignmentsToCreate: Array<{
        classroomId: string;
        studentId: string;
      }> = [];
      const teacherAssignmentsToCreate: Array<{
        classroomId: string;
        userId: string;
      }> = [];
      const existingTeacherChecks: Array<{
        classroomId: string;
        userId: string;
      }> = [];

      // Process users and prepare batch operations
      for (const userData of processedUsers) {
        const userId = emailToUserId.get(userData.email);
        if (!userId || userData.classroomNames.length === 0) continue;

        const userRole = userRoleMap.get(userData.email);
        if (userRole === "admin") continue;

        for (const className of userData.classroomNames) {
          const classroomId = classroomNameToIdMap.get(className);
          if (!classroomId) continue;

          if (userRole === "student") {
            studentAssignmentsToCreate.push({
              classroomId,
              studentId: userId,
            });
          } else if (userRole === "teacher") {
            existingTeacherChecks.push({
              classroomId,
              userId,
            });
          }
        }

        if (userData.classroomNames.length > 0) {
          classroomsAssigned++;
        }
      }

      // Batch check existing teacher assignments
      if (existingTeacherChecks.length > 0) {
        const existingTeachers = await prisma.classroomTeachers.findMany({
          where: {
            OR: existingTeacherChecks.map((check) => ({
              classroomId: check.classroomId,
              userId: check.userId,
            })),
          },
          select: { classroomId: true, userId: true },
        });

        const existingTeacherSet = new Set(
          existingTeachers.map((et) => `${et.classroomId}-${et.userId}`),
        );

        // Filter out existing teacher assignments
        for (const check of existingTeacherChecks) {
          if (!existingTeacherSet.has(`${check.classroomId}-${check.userId}`)) {
            teacherAssignmentsToCreate.push(check);
          }
        }
      }

      // Batch create student assignments using upsertMany (if available) or individual upserts
      if (studentAssignmentsToCreate.length > 0) {
        // Use createMany with skipDuplicates for better performance
        try {
          await prisma.classroomStudent.createMany({
            data: studentAssignmentsToCreate,
            skipDuplicates: true,
          });
          studentAssignments = studentAssignmentsToCreate.length;
        } catch (error) {
          // Fallback to individual upserts if createMany fails
          console.log("Falling back to individual student upserts...");
          for (const assignment of studentAssignmentsToCreate) {
            await prisma.classroomStudent.upsert({
              where: {
                classroomId_studentId: {
                  classroomId: assignment.classroomId,
                  studentId: assignment.studentId,
                },
              },
              update: {},
              create: assignment,
            });
          }
          studentAssignments = studentAssignmentsToCreate.length;
        }
      }

      // Batch create teacher assignments
      if (teacherAssignmentsToCreate.length > 0) {
        await prisma.classroomTeachers.createMany({
          data: teacherAssignmentsToCreate,
          skipDuplicates: true,
        });
        teacherAssignments = teacherAssignmentsToCreate.length;
      }

      classroomTimer.end("Classroom assignments completed");
      dbTimer.log(
        "Classroom assignments summary",
        `Students: ${studentAssignments}, Teachers: ${teacherAssignments}, Users assigned: ${classroomsAssigned}`,
      );

      // Update createdClassrooms for response (empty for students.csv or teachers.csv)
      createdClassrooms = [];
    }

    dbTimer.end("All database operations completed");

    // Delete temp file
    const cleanupTimer = createTimer("CLEANUP_RESPONSE");
    unlink(filePath, (err) => {
      if (err) {
        console.error("Error deleting temp file:", err);
      }
    });
    cleanupTimer.log("Temp file cleanup completed");

    // Prepare response message and stats based on file type
    let message = "";
    let note = "";
    let stats: any = {
      totalRows: csvData.length,
      errors: errors.length,
    };

    if (filename === "students.csv" || filename === "teachers.csv") {
      message = "Users uploaded and created successfully";
      note =
        "Users created with default values: password=null, cefrLevel=A0-, level=1, xp=0. Users need to set passwords before they can log in.";
      stats = {
        ...stats,
        processedUsers: processedUsers.length,
        createdUsers: createdUsers?.length || 0,
        roleAssignments: roleAssignments?.length || 0,
        classroomsAssigned: classroomsAssigned || 0,
        studentAssignments: studentAssignments || 0,
        teacherAssignments: teacherAssignments || 0,
      };
    } else if (filename === "classes.csv") {
      message = "Classes uploaded and created successfully";
      note =
        "Classes created successfully. You can now import students and teachers to assign them to these classes.";
      stats = {
        ...stats,
        processedClasses: processedClasses.length,
        createdClassrooms: createdClassrooms.length,
      };
    }
    cleanupTimer.log("Response data prepared");

    const totalTime = apiTimer.end("Upload classes API request completed");
    console.log(`✅ API request completed successfully in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: message,
      fileName: fileName,
      filePath: filePath,
      originalName: file.name,
      size: file.size,
      timestamp: timestamp,
      stats: stats,
      performanceStats: {
        totalExecutionTime: totalTime,
        processedAt: new Date().toISOString(),
      },
      schoolInfo: effectiveSchoolId
        ? {
            id: effectiveSchoolId,
            note:
              filename === "students.csv" || filename === "teachers.csv"
                ? "All imported users have been assigned to this school"
                : "All imported classes have been assigned to this school",
          }
        : {
            note: "system user - data imported without school assignment",
          },
      classrooms: createdClassrooms,
      note: note,
    });
  } catch (error) {
    const errorTime = apiTimer.end("Upload classes API request failed");
    console.error(`❌ Classes upload error after ${errorTime}ms:`, error);
    return NextResponse.json(
      {
        error: "Failed to upload classes file",
        performanceStats: {
          totalExecutionTime: errorTime,
          failedAt: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
