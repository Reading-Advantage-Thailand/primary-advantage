import { getDashboardHeatmapModel } from "../models/dashboardModel";
import { AuthenticatedUser } from "../utils/middleware";

export const fetchDashboardHeatmapController = async (
  entityIds?: string,
  timeframe?: string,
  user?: AuthenticatedUser,
) => {
  try {
    const heatmapData = await getDashboardHeatmapModel(
      entityIds,
      timeframe,
      user,
    );

    return heatmapData;
  } catch (error) {
    console.error("[Controller] fetchDashboardHeatmap - Error:", error);
    throw error;
  }
};
