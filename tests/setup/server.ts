import { vi } from "vitest";
// Next.js replaces this marker at build time; Vitest runs trusted server code directly.
vi.mock("server-only", () => ({}));
