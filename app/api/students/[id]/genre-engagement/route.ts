import { getGenreEngagementController } from "@/server/controllers/studentController";
import { NextRequest } from "next/server";

/**
 * GET /api/students/[id]/genre-engagement
 * Fetch genre engagement metrics for a specific student
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing student ID
 * @returns Genre engagement metrics including top genres, recommendations, and CEFR distribution
 * 
 * @example
 * GET /api/students/user123/genre-engagement
 * 
 * Response:
 * {
 *   "scope": "student",
 *   "scopeId": "user123",
 *   "timeframe": "30d",
 *   "topGenres": [...],
 *   "recommendations": [...],
 *   "cefrDistribution": {...},
 *   "totalEngagementScore": 150.5,
 *   "calculatedAt": "2024-01-01T00:00:00.000Z"
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return await getGenreEngagementController(req, { params });
}




