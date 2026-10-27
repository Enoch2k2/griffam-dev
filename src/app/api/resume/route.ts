import { connection } from "next/server";
import { downloadResume } from "@/server/resume/endpoint";
export async function GET() {
  await connection();
  return downloadResume();
}
