import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createZoomMeeting, getZoomMeeting, readZoomConfig } from "./meetings";
const config = { accountId: "account", clientId: "client", clientSecret: "secret", hostUserId: "host" };
const slot = { id: "booking-1", start: "2026-12-01T15:00:00Z", end: "2026-12-01T15:30:00Z" };
const meeting = { id: 12345678901, host_id: "host", type: 2, agenda: "GriffamDev booking booking-1", start_time: slot.start, duration: 30, join_url: "https://us02web.zoom.us/j/12345678901?pwd=participant", start_url: "SECRET-HOST-URL" };
const fetcher = vi.fn();
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
beforeEach(() => { fetcher.mockReset(); vi.stubGlobal("fetch", fetcher); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("reads complete private config only", () => {
  for (const key of ["ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET", "ZOOM_HOST_USER_ID"]) vi.stubEnv(key, "");
  expect(readZoomConfig()).toBeNull();
  vi.stubEnv("ZOOM_ACCOUNT_ID", "account"); vi.stubEnv("ZOOM_CLIENT_ID", "client"); vi.stubEnv("ZOOM_CLIENT_SECRET", "secret"); vi.stubEnv("ZOOM_HOST_USER_ID", "host");
  expect(readZoomConfig()).toEqual(config);
});
it("creates a unique private scheduled meeting and returns only its participant URL", async () => {
  fetcher.mockResolvedValueOnce(response({ access_token: "token" })).mockResolvedValueOnce(response(meeting));
  expect(await createZoomMeeting(config, slot)).toEqual({ id: "12345678901", joinUrl: meeting.join_url });
  const body = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(body).toMatchObject({ type: 2, agenda: "GriffamDev booking booking-1", duration: 30, settings: { use_pmi: false, waiting_room: true, join_before_host: false, auto_recording: "none" } });
  expect(body.password).toHaveLength(10);
  expect(fetcher.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
});
it("never retries an ambiguous create or leaks provider errors", async () => {
  fetcher.mockResolvedValueOnce(response({ access_token: "token" })).mockRejectedValueOnce(new Error("secret-token"));
  await expect(createZoomMeeting(config, slot)).rejects.toThrow("Zoom meeting could not be verified");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("recovers only the expected host, booking marker, time, duration and meeting ID", async () => {
  for (const change of [{}, { host_id: "other" }, { agenda: "other" }, { start_time: "2026-12-02T15:00:00Z" }, { duration: 60 }, { id: 12345678902 }, { join_url: "https://evil.example/j/12345678901" }, { type: 3 }]) {
    fetcher.mockResolvedValueOnce(response({ access_token: "token" })).mockResolvedValueOnce(response({ ...meeting, ...change }));
    const result = getZoomMeeting(config, "12345678901", slot);
    if (Object.keys(change).length) await expect(result).rejects.toThrow("Zoom meeting could not be verified");
    else await expect(result).resolves.toEqual({ id: "12345678901", joinUrl: meeting.join_url });
  }
});
it("stops on failed credentials without attempting meeting creation", async () => {
  fetcher.mockResolvedValueOnce(response({ error: "private detail" }, 401));
  await expect(createZoomMeeting(config, slot)).rejects.toThrow("Zoom meeting could not be verified");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
