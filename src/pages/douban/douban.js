import "./douban.css";
import { notifySwupPageReady, runPageInit } from "../../common/js/page-runtime.js";

const API_BASE = "/apis/api.douban.moony.la/v1alpha1/doubanmovies";
const TYPE_ICONS = {
  movie: "icon-[heroicons--film]",
  book: "icon-[heroicons--book-open]",
  music: "icon-[heroicons--musical-note]",
  game: "icon-[heroicons--puzzle-piece]",
  drama: "icon-[heroicons--sparkles]",
};

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function normalizeListResult(data) {
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: Number(data?.page || 1),
    totalPages: Number(data?.totalPages || 1),
    total: Number(data?.total || 0),
    hasPrevious: Boolean(data?.hasPrevious),
    hasNext: Boolean(data?.hasNext),
  };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function appendMeta(meta, value) {
  if (!value) return;
  meta.appendChild(createEl("span", "", String(value)));
}

function createFilterButton({ label, value, filter, active, icon, count, extraClass = "" }) {
  const button = createEl("button", `douban-filter-item ${extraClass}${active ? " active" : ""}`.trim());
  button.type = "button";
  button.dataset.doubanFilter = filter;
  button.dataset.value = value || "";

  if (icon) {
    button.appendChild(createEl("span", `douban-type-icon ${icon}`));
  }

  button.appendChild(createEl("span", "", label));

  if (count != null) {
    button.appendChild(createEl("span", "douban-filter-count", String(count)));
  }

  return button;
}

function normalizeGenre(genre) {
  if (typeof genre === "string") {
    return {
      name: genre,
      doubanCount: null,
    };
  }

  return {
    name: genre?.name || "",
    doubanCount: genre?.doubanCount,
  };
}

function createCard(item) {
  const spec = item?.spec || {};
  const faves = item?.faves || {};
  const article = createEl("article", "douban-card-wrap");
  const link = createEl("a", "douban-card");
  link.href = spec.link || "#";
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const cover = createEl("div", "douban-cover");
  if (spec.poster) {
    const img = document.createElement("img");
    img.src = spec.poster;
    img.alt = spec.name || "豆瓣条目";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    if (img.complete && img.naturalHeight !== 0) img.classList.add("loaded");
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    img.addEventListener("error", () => img.classList.add("load-error"), { once: true });
    cover.appendChild(img);
  }

  const placeholder = createEl("div", "douban-cover-placeholder");
  placeholder.appendChild(createEl("span", "icon-[heroicons--photo] h-8 w-8"));
  cover.appendChild(placeholder);

  if (spec.score != null && spec.score !== "") {
    cover.appendChild(createEl("span", "douban-score", String(spec.score)));
  }

  if (spec.type) {
    cover.appendChild(createEl("span", "douban-type-badge", spec.type));
  }

  const info = createEl("div", "douban-info");
  info.appendChild(createEl("h2", "douban-name", spec.name || "未命名条目"));

  const meta = createEl("div", "douban-meta");
  appendMeta(meta, spec.year);
  appendMeta(meta, spec.dataType);
  appendMeta(meta, formatDate(faves.createTime));
  if (meta.children.length > 0) info.appendChild(meta);

  if (spec.cardSubtitle) {
    info.appendChild(createEl("p", "douban-card-subtitle", spec.cardSubtitle));
  }

  if (faves.remark) {
    info.appendChild(createEl("p", "douban-remark", faves.remark));
  }

  link.append(cover, info);
  article.appendChild(link);
  return article;
}

function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}

function buildUrl(path, params) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") url.searchParams.set(key, value);
  });
  return url;
}

function initDoubanPage() {
  const root = document.querySelector(".douban-page");
  if (!root) return;

  const pageSize = Number(root.dataset.pageSize || 20);
  const state = {
    page: 1,
    size: pageSize,
    status: "done",
    type: "",
    dataType: "",
    genre: "",
  };

  const els = {
    total: root.querySelector("[data-douban-total]"),
    types: root.querySelector("[data-douban-types]"),
    genres: root.querySelector("[data-douban-genres]"),
    grid: root.querySelector("[data-douban-grid]"),
    loading: root.querySelector("[data-douban-loading]"),
    empty: root.querySelector("[data-douban-empty]"),
    error: root.querySelector("[data-douban-error]"),
    pagination: root.querySelector("[data-douban-pagination]"),
    pageInfo: root.querySelector("[data-douban-page-info]"),
    prev: root.querySelector("[data-douban-prev]"),
    next: root.querySelector("[data-douban-next]"),
  };

  const updateButtons = () => {
    root.querySelectorAll("[data-douban-filter]").forEach((button) => {
      const filter = button.dataset.doubanFilter;
      const value = button.dataset.value || "";
      button.classList.toggle("active", (state[filter] || "") === value);
    });
  };

  const renderItems = (result) => {
    els.grid.replaceChildren(...result.items.map(createCard));
    if (els.total) els.total.textContent = String(result.total);
    if (els.pageInfo) els.pageInfo.textContent = `${result.page} / ${Math.max(result.totalPages, 1)}`;
    if (els.prev) els.prev.disabled = !result.hasPrevious;
    if (els.next) els.next.disabled = !result.hasNext;
    setHidden(els.grid, result.items.length === 0);
    setHidden(els.empty, result.items.length > 0);
    setHidden(els.pagination, result.totalPages <= 1);
  };

  const loadItems = async () => {
    setHidden(els.loading, false);
    setHidden(els.error, true);

    try {
      const response = await fetch(buildUrl(API_BASE, state));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = normalizeListResult(await response.json());
      renderItems(result);
      state.page = result.page;
    } catch (error) {
      console.warn("[Douban] load failed:", error.message);
      setHidden(els.grid, true);
      setHidden(els.empty, true);
      setHidden(els.pagination, true);
      setHidden(els.error, false);
    } finally {
      setHidden(els.loading, true);
    }
  };

  const loadGenres = async () => {
    try {
      const response = await fetch(buildUrl(`${API_BASE}/-/genres`, { type: state.type }));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const genres = await response.json();
      const buttons = [
        createFilterButton({
          label: "全部题材",
          value: "",
          filter: "genre",
          active: state.genre === "",
          extraClass: "douban-genre-item",
        }),
        ...(Array.isArray(genres) ? genres : [])
          .map(normalizeGenre)
          .filter((genre) => genre.name)
          .map((genre) =>
            createFilterButton({
              label: genre.name,
              value: genre.name,
              filter: "genre",
              active: state.genre === genre.name,
              count: genre.doubanCount,
              extraClass: "douban-genre-item",
            }),
          ),
      ];
      els.genres.replaceChildren(...buttons);
      setHidden(els.genres, buttons.length <= 1);
    } catch {
      setHidden(els.genres, true);
    }
  };

  const loadTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/-/types`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const types = await response.json();
      const buttons = [
        createFilterButton({
          label: "全部",
          value: "",
          filter: "type",
          active: state.type === "",
          icon: "icon-[heroicons--squares-2x2]",
        }),
        ...(Array.isArray(types) ? types : []).map((type) =>
          createFilterButton({
            label: type.name,
            value: type.key,
            filter: "type",
            active: state.type === type.key,
            icon: TYPE_ICONS[type.key] || "icon-[heroicons--sparkles]",
            count: type.doubanCount,
          }),
        ),
      ];
      els.types.replaceChildren(...buttons);
    } catch {
      // 保留静态“全部”按钮。
    }
  };

  root.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-douban-filter]");
    if (filterButton) {
      const filter = filterButton.dataset.doubanFilter;
      state[filter] = filterButton.dataset.value || "";
      state.page = 1;
      if (filter === "type") state.genre = "";
      updateButtons();
      if (filter === "type") loadGenres();
      loadItems();
      return;
    }

    if (event.target.closest("[data-douban-prev]") && state.page > 1) {
      state.page -= 1;
      loadItems();
      return;
    }

    if (event.target.closest("[data-douban-next]")) {
      state.page += 1;
      loadItems();
    }
  });

  loadTypes();
  loadGenres();
  loadItems();
}

runPageInit(initDoubanPage);
notifySwupPageReady();
