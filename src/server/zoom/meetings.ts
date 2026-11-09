import "server-only";
import { randomBytes } from "node:crypto";

export type ZoomConfig = { accountId: string; clientId: string; clientSecret: string; hostUserId: string };
export type MeetingSlot = { id: string; start: string; end: string };
export function readZoomConfig(): ZoomConfig | null {
  const accountId = process.env.ZOOM_ACCOUNT_ID?.trim();
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  const hostUserId = process.env.ZOOM_HOST_USER_ID?.trim();
  return accountId && clientId && clientSecret && hostUserId ? { accountId, clientId, clientSecret, hostUserId } : null;
}
function failure() { return new Error("Zoom meeting could not be verified"); }
function duration(slot: MeetingSlot) {
  const minutes = (Date.parse(slot.end) - Date.parse(slot.start)) / 60_000;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(slot.id) || minutes !== 30) throw failure();
  return minutes;
}
function marker(slot: MeetingSlot) { return `GriffamDev booking ${slot.id}`; }
async function request(url: string, init: RequestInit) {
  // Fetch does not retry: a timed-out create must be reconciled, never blindly repeated.
  const response = await fetch(url, { ...init, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw failure();
  return await response.json() as Record<string, unknown>;
}
async function accessToken(config: ZoomConfig) {
  const data = await request("https://zoom.us/oauth/token", {
    method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "account_credentials", account_id: config.accountId }).toString(),
  });
  if (typeof data.access_token !== "string" || !data.access_token) throw failure();
  return data.access_token;
}
function verified(data: Record<string, unknown>, config: ZoomConfig, slot: MeetingSlot, expectedId?: string) {
  const id = typeof data.id === "number" && Number.isSafeInteger(data.id) ? String(data.id) : data.id;
  const hostMatches = data.host_id === config.hostUserId || (typeof data.host_email === "string" && data.host_email.toLowerCase() === config.hostUserId.toLowerCase());
  if (typeof id !== "string" || !/^\d{9,15}$/.test(id) || (expectedId && id !== expectedId) || !hostMatches || data.type !== 2 || data.agenda !== marker(slot) || typeof data.start_time !== "string" || Date.parse(data.start_time) !== Date.parse(slot.start) || data.duration !== duration(slot)) throw failure();
  if (typeof data.join_url !== "string") throw failure();
  const url = new URL(data.join_url);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || !url.searchParams.get("pwd") || [...url.searchParams.keys()].some(key => key !== "pwd") || !(url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us")) || url.pathname !== `/j/${id}`) throw failure();
  return { id, joinUrl: url.toString() };
}
export async function createZoomMeeting(config: ZoomConfig, slot: MeetingSlot) {
  try {
    const minutes = duration(slot);
    const token = await accessToken(config);
    const data = await request(`https://api.zoom.us/v2/users/${encodeURIComponent(config.hostUserId)}/meetings`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "GriffamDev discovery call", type: 2, start_time: new Date(slot.start).toISOString(), duration: minutes, timezone: "UTC", agenda: marker(slot), password: randomBytes(5).toString("hex"),
        settings: { use_pmi: false, waiting_room: true, join_before_host: false, auto_recording: "none", meeting_invitees: [] } }),
    });
    return verified(data, config, slot);
  } catch { throw failure(); }
}
export async function getZoomMeeting(config: ZoomConfig, meetingId: string, expected: MeetingSlot) {
  try {
    duration(expected);
    if (!/^\d{9,15}$/.test(meetingId)) throw failure();
    const token = await accessToken(config);
    const data = await request(`https://api.zoom.us/v2/meetings/${meetingId}`, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
    return verified(data, config, expected, meetingId);
  } catch { throw failure(); }
}

export async function cancelZoomMeeting(config: ZoomConfig, meetingId: string) {
  try {
    if (!/^\d{9,15}$/.test(meetingId)) throw failure();
    const token = await accessToken(config);
    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    // Zoom reports a missing meeting as 404, which means a prior cancellation
    // succeeded and makes this operation safe to retry.
    if (!response.ok && response.status !== 404) throw failure();
  } catch { throw failure(); }
}
