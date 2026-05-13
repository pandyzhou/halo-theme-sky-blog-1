#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:8090").replace(/\/+$/, "");
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || "10000", 10);
const deepMode = /^(1|true|yes|on)$/i.test(process.env.VERIFY_PLUGIN_DEEP || "");

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
    name: "Douban",
    path: "/douban",
    markers: ["douban-page", "douban-grid", "douban.js"],
  },
  {
    name: "Login",
    path: "/login",
    markers: ["halo-form", "欢迎回来", "fragmentTemplateName"],
  },
];

function envPath(name, fallback) {
  return process.env[name] || fallback;
}

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

const deepChecks = [
  {
    name: "Home Plugin Widgets",
    path: envPath("HOME_URL", "/"),
    markers: ["文档中心", "友情链接", "瞬间说说"],
    match: "all",
  },
  {
    name: "Docsme Catalog",
    path: envPath("DOC_CATALOG_URL", "/docs/halo-theme-sky-blog-1/theme-settings"),
    markers: [
      "doc-layout",
      "主题配置功能详解",
      "plugin-docsme 免费版 1.5.0 / 专业版 1.6.0",
      "var docsme = { disableThemeFunction: true }",
    ],
    match: "all",
  },
  {
    name: "Article Shiki",
    path: envPath("ARTICLE_CODE_URL", "/archives/editor-feature-demo"),
    markers: ["plugin-shiki", "shiki-code.js?version=1.3.0", "<shiki-code"],
    match: "all",
  },
  {
    name: "Comment Widget",
    path: envPath("COMMENT_PAGE_URL", process.env.DOC_DETAIL_URL || "/archives/editor-feature-demo"),
    markers: ["plugin-comment-widget", "comment-widget.js?version=3.1.1", "评论交流"],
    match: "all",
  },
  {
    name: "Search Widget",
    path: envPath("SEARCH_PAGE_URL", "/"),
    markers: ["PluginSearchWidget", "SearchWidget.open()"],
    match: "all",
  },
  {
    name: "Lightgallery Moments",
    path: envPath("LIGHTGALLERY_PAGE_URL", "/moments"),
    markers: ["PluginLightGallery", "lightgallery.min.js", "moment-media"],
    match: "all",
  },
  {
    name: "Author Moments",
    path: envPath("AUTHOR_URL", "/authors/sky0821"),
    markers: ["author_tab", "瞬间 (", "查看所有瞬间"],
    match: "all",
  },
];

const deepApiChecks = [
  {
    name: "Douban Genres API",
    path: "/apis/api.douban.moony.la/v1alpha1/doubanmovies/-/genres",
    validate(data) {
      const genres = Array.isArray(data)
        ? data.map((genre) => (typeof genre === "string" ? genre : genre?.name)).filter(Boolean)
        : [];

      return {
        ok: genres.length > 0,
        marker: genres.slice(0, 6).join(", ") || "-",
        error: "genre data not found",
      };
    },
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

if (deepMode) {
  checks.push(...deepChecks);
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

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    const data = await response.json();
    return {
      response,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function findMarkers(html, markers) {
  return markers.filter((marker) => html.includes(marker));
}

function evaluateMarkers(html, check) {
  const foundMarkers = findMarkers(html, check.markers);
  const ok = check.match === "all" ? foundMarkers.length === check.markers.length : foundMarkers.length > 0;

  return {
    foundMarkers,
    ok,
  };
}

const results = [];

for (const check of checks) {
  const url = resolveUrl(check.path);
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const markers = evaluateMarkers(html, check);
    const ok = response.status === 200 && markers.ok;
    results.push({
      ...check,
      url,
      status: response.status,
      marker: markers.foundMarkers.join(", ") || "-",
      ok,
      error: ok
        ? ""
        : markers.ok
          ? `unexpected status ${response.status}`
          : check.match === "all"
            ? "required markers not found"
            : "marker not found",
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

if (deepMode) {
  for (const check of deepApiChecks) {
    const url = resolveUrl(check.path);
    try {
      const { response, data } = await fetchJsonWithTimeout(url);
      const validation = check.validate(data);
      const ok = response.status === 200 && validation.ok;
      results.push({
        ...check,
        url,
        status: response.status,
        marker: validation.marker || "-",
        ok,
        error: ok ? "" : validation.ok ? `unexpected status ${response.status}` : validation.error,
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
}

const width = Math.max(...results.map((result) => result.name.length), 10);

console.log(`Plugin smoke base: ${baseUrl}`);
if (deepMode) {
  console.log("Plugin smoke mode: deep");
}
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
