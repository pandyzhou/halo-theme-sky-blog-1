#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "10000", 10);

const checks = [
  {
    name: "Links",
    path: "/links",
    markers: ["友情链接", "links-content", "link-submit-modal"],
  },
  {
    name: "Photos",
    path: "/photos",
    markers: ["photo-grid", "图库", "photos.js"],
  },
  {
    name: "Moments",
    path: "/moments",
    markers: ["moments-list", "瞬间", "moments.js"],
  },
  {
    name: "Friends",
    path: "/friends",
    markers: ["朋友圈", "friends-content", "__completeSwupPageInit"],
  },
  {
    name: "Docsme",
    path: "/docs",
    markers: ["文档", "doc.js", "docs-dock"],
  },
  {
    name: "Bangumi",
    path: "/bangumis",
    markers: ["bangumi-page", "追番", "bangumi.js"],
  },
  {
    name: "Steam",
    path: "/steam",
    markers: ["steam-page", "Steam", "steam.js"],
  },
  {
    name: "Equipment",
    path: "/equipments",
    markers: ["equipment-page", "装备", "equipment.js"],
  },
  {
    name: "Login",
    path: "/login",
    markers: ["halo-form", "欢迎回来", "fragmentTemplateName"],
  },
];

const optionalChecks = [
  {
    env: "PHOTO_DETAIL_URL",
    name: "Photo Detail",
    markers: ["photo-detail-page", "photo-detail-image"],
  },
  {
    env: "MOMENT_DETAIL_URL",
    name: "Moment Detail",
    markers: ["moment", "halo:comment", "handleMomentUpvote"],
  },
  {
    env: "DOC_DETAIL_URL",
    name: "Doc Detail",
    markers: ["doc-layout", "article-content", "toc-nav"],
  },
];

for (const optional of optionalChecks) {
  const path = process.env[optional.env];
  if (path) {
    checks.push({
      name: optional.name,
      path,
      markers: optional.markers,
    });
  }
}

function resolveUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function findMarker(html, markers) {
  return markers.find((marker) => html.includes(marker));
}

const results = [];

for (const check of checks) {
  const url = resolveUrl(check.path);
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const marker = findMarker(html, check.markers);
    const ok = response.status === 200 && Boolean(marker);
    results.push({
      ...check,
      url,
      status: response.status,
      marker: marker || "-",
      ok,
      error: ok ? "" : marker ? `unexpected status ${response.status}` : "marker not found",
    });
  } catch (error) {
    results.push({
      ...check,
      url,
      status: "-",
      marker: "-",
      ok: false,
      error: error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message,
    });
  }
}

const width = Math.max(...results.map((result) => result.name.length), 10);

console.log(`Plugin smoke base: ${baseUrl}`);
for (const result of results) {
  const icon = result.ok ? "OK" : "FAIL";
  const name = result.name.padEnd(width, " ");
  const details = result.ok
    ? `status=${result.status} marker=${result.marker}`
    : `status=${result.status} ${result.error}`;
  console.log(`${icon} ${name} ${result.path} ${details}`);
}

const failures = results.filter((result) => !result.ok);
if (failures.length > 0) {
  console.error(`Plugin smoke failed: ${failures.length}/${results.length}`);
  process.exit(1);
}

console.log(`Plugin smoke passed: ${results.length}/${results.length}`);
