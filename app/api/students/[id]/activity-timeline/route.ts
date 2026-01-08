import { getActivityTimelineController } from "@/server/controllers/studentController";
import { NextRequest } from "next/server";

/**
 * GET /api/students/[id]/activity-timeline
 * Fetch activity timeline for a specific student
 * 
 * @param request - Next.js request object with query parameters:
 *   - timeframe: "7d" | "30d" | "90d" (default: "30d")
 *   - timezone: IANA timezone string (default: "UTC")
 * @param params - Route parameters containing student ID
 * @returns Activity timeline data with events grouped by type
 * 
 * @example
 * GET /api/students/user123/activity-timeline?timeframe=7d&timezone=Asia/Bangkok
 * 
 * Response:
 * {
 *   "scope": "student",
 *   "entityId": "user123",
 *   "timeframe": "7d",
 *   "timezone": "Asia/Bangkok",
 *   "events": [...],
 *   "metadata": {
 *     "totalEvents": 42,
 *     "eventTypes": { "reading": 15, "assignment": 10, ... },
 *     "dateRange": { "start": "2024-01-01", "end": "2024-01-07" }
 *   },
 *   "cache": {
 *     "cached": false,
 *     "generatedAt": "2024-01-07T12:00:00.000Z"
 *   }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getActivityTimelineController(req, { params });
}




