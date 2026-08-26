export const MID_AUTUMN_2026 = {
  startAt: "2026-08-26T00:00:00+07:00",
  endAt: "2026-09-25T23:59:59+07:00",
  endLabel: "Hết ngày 25/09/2026",
  modelLabel: "Nhutbot 1.0 Flash",
  teamLabel: "By Nhutcoder Team",
  assetUri: "/manus-storage/mcp-hub-midautumn-2026_2d964d6d.png",
} as const;

export function isMidAutumnCampaignActive(now = new Date()) {
  return now >= new Date(MID_AUTUMN_2026.startAt) && now <= new Date(MID_AUTUMN_2026.endAt);
}

export function midAutumnCampaignPeriod(now = new Date()) {
  const start = new Date(MID_AUTUMN_2026.startAt);
  const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  return `${start.toLocaleDateString("vi-VN", options)} – ${MID_AUTUMN_2026.endLabel}`;
}
