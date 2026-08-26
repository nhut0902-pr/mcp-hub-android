import { describe, expect, it } from "vitest";

import { isMidAutumnCampaignActive, midAutumnCampaignPeriod } from "../lib/midautumn-campaign";

describe("chiến dịch Trung Thu 2026", () => {
  it("chỉ bật từ ngày mở chiến dịch đến hết ngày Trung Thu", () => {
    expect(isMidAutumnCampaignActive(new Date("2026-08-26T00:00:00+07:00"))).toBe(true);
    expect(isMidAutumnCampaignActive(new Date("2026-09-25T23:59:59+07:00"))).toBe(true);
    expect(isMidAutumnCampaignActive(new Date("2026-09-26T00:00:00+07:00"))).toBe(false);
  });

  it("hiển thị mốc kết thúc rõ ràng cho người dùng", () => {
    expect(midAutumnCampaignPeriod()).toContain("25/09/2026");
  });
});
