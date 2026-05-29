import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // ตั้งค่า staleTime เพื่อให้ข้อมูลไม่เก่าทันทีเมื่อถึง client
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Returns a QueryClient instance. Creates a new one on the server for each request,
 * or returns a singleton instance on the client to preserve cache.
 */
export function getQueryClient() {
  if (isServer) {
    // บน Server: สร้าง client ใหม่เสมอสำหรับ "ทุก request"
    return makeQueryClient();
  } else {
    // บน Browser: ใช้ client เดิม (Singleton) เพื่อรักษา cache ไว้
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
