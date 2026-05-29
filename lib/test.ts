// test-storage.ts
import { bucket } from "@/utils/storage";

/**
 * Tests the connection to Google Cloud Storage bucket.
 * @returns true if connection is successful, false otherwise
 */
export async function testConnection() {
  try {
    await bucket.exists();
    console.log("✅ Successfully connected to Google Cloud Storage");
    return true;
  } catch (error) {
    console.error("❌ Failed to connect:", error);
    return false;
  }
}
