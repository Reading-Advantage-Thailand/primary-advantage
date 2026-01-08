// import { prisma } from "@/lib/prisma";

// export async function getAISummaryModel(
//   kind?: string,
//   contextId?: string,
//   refresh?: string,
// ) {
//   try {
//     const aiSummary = await prisma.aiSummary.findFirst({
//       where: {
//         kind,
//         contextId,
//         refresh,
//       },
//     });
//     return aiSummary;
//   } catch (error) {
//     console.error("[Model] getAISummaryModel - Error:", error);
//     throw error;
//   }
// }
