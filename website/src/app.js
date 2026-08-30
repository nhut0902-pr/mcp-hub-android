// MCP Hub website — smooth scroll + dynamic APK download

document.querySelectorAll('a[href^="#"]').forEach((anchor) =>
  anchor.addEventListener("click", (event) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }),
);

// Fetch the latest release info and update download buttons + version badge
(async function loadLatestRelease() {
  const FALLBACK_URL = "https://github.com/nhut0902-pr/mcp-hub-android/releases";
  const els = {
    apkUrl: document.querySelectorAll("[data-apk-url]"),
    apkVersion: document.querySelectorAll("[data-apk-version]"),
    apkNotes: document.querySelectorAll("[data-apk-notes]"),
    apkPublishedAt: document.querySelectorAll("[data-apk-published-at]"),
    apkCard: document.querySelector("[data-apk-card]"),
    apkLoader: document.querySelector("[data-apk-loader]"),
  };

  try {
    const res = await fetch("./update.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.apkUrl) throw new Error("update.json has no apkUrl");

    els.apkUrl.forEach((el) => (el.href = data.apkUrl));
    els.apkVersion.forEach((el) => (el.textContent = data.version || "?"));
    if (data.notes) {
      els.apkNotes.forEach((el) => (el.textContent = data.notes));
    }
    if (data.publishedAt) {
      const d = new Date(data.publishedAt);
      els.apkPublishedAt.forEach(
        (el) => (el.textContent = d.toLocaleDateString("vi-VN")),
      );
    }
    if (els.apkCard) els.apkCard.hidden = false;
    if (els.apkLoader) els.apkLoader.hidden = true;
  } catch (err) {
    console.warn("[update.json] load failed:", err);
    els.apkUrl.forEach((el) => (el.href = FALLBACK_URL));
    if (els.apkCard) els.apkCard.hidden = false;
    if (els.apkLoader) els.apkLoader.hidden = true;
  }
})();
