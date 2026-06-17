# Douban UI 适配设计方案

> 基线：`plugin-douban v1.2.5`。本方案只设计主题侧 `/douban` 页面，不重写插件同步、解析、管理接口。

## 设计定位

豆瓣页属于“个人影音书游收藏记录”，应和当前主题的 Bangumi、Steam、Equipment 页面保持同一类内容收藏体验：

- 页面壳 SSR 优先：消费插件 `/douban` 路由注入的 `title / templateId`。
- 列表走公开 API：`plugin-douban v1.2.5` 默认路由懒加载 `douban` 变量在空筛选参数下会触发插件侧 `Map.of(null)` NPE，主题第一版避免触发该变量，改用公开 API 渲染海报网格。
- 视觉克制：不要做营销 Hero，不做大面积渐变背景；用标题区、筛选条、海报网格表达内容。
- 内容可扫：类型、状态、题材筛选清晰，卡片上只放最有用的信息。
- PJAX 友好：第一版尽量无运行时依赖；如果后续加交互，脚本必须走页面入口并可重复初始化。

## 页面层级

推荐结构：

1. `templates/douban.html`
   - 页面入口。
   - 写明兼容基线：`plugin-douban v1.2.5`。
   - 引入 `modules/douban/layout :: html` 和 `modules/douban/content :: douban-content`。

2. `templates/modules/douban/layout.html`
   - 复用主题公共布局约定。
   - 注入 `assets/css/douban.css`。
   - 注入 `assets/js/douban.js`，用于调用公开 API 并渲染海报网格。

3. `templates/modules/douban/content.html`
   - 页面标题。
   - 筛选区容器。
   - 豆瓣卡片网格容器。
   - 加载 / 空状态 / 错误状态 / 分页容器。

4. `src/pages/douban/douban.js`
   - 调用公开 API 获取类型、题材和列表。
   - 在浏览器端渲染海报卡片。
   - 处理筛选和分页。

5. `src/pages/douban/douban.css`
   - 页面专属样式、网格、卡片、筛选条、动画。

## 数据契约

路由变量：

- `title`：插件设置标题，默认 `豆瓣记录`
- `templateId`：`douban`

公开 API：

- `GET /apis/api.douban.moony.la/v1alpha1/doubanmovies`
- `GET /apis/api.douban.moony.la/v1alpha1/doubanmovies/-/types`
- `GET /apis/api.douban.moony.la/v1alpha1/doubanmovies/-/genres`

当前本地 `plugin-douban v1.2.5` 的 `genres` 接口可返回字符串数组，例如 `["喜剧","剧情"]`；主题运行时必须同时兼容字符串和带 `name / doubanCount` 的对象，不能只按对象结构读取。

列表查询参数：

- `type`
- `status`
- `dataType`
- `genre`

卡片常用字段：

- `item.metadata.name`
- `item.spec.name`
- `item.spec.link`
- `item.spec.poster`
- `item.spec.type`
- `item.spec.dataType`
- `item.spec.score`
- `item.spec.year`
- `item.spec.genres`
- `item.spec.cardSubtitle`
- `item.faves.status`
- `item.faves.createTime`
- `item.faves.remark`

封面图片使用 `spec.poster`。如果返回的是 `img*.doubanio.com` 直链，浏览器可能收到远端 `418`；主题只做加载失败占位兜底，真实图片代理应通过插件设置 `isProxy / proxyHost` 完成，避免在主题中硬编码第三方代理。

## 视觉方案

### 页面标题

保持 Bangumi / Equipment 的标题密度：

- 容器：`max-w-6xl mx-auto px-4 py-8`
- 标题：`2rem` 左右，不做超大 hero 字号。
- 副标题：使用插件 title 或主题配置文案，低对比度。
- 右侧可选统计胶囊：桌面端显示总数，移动端隐藏。

示例结构：

```html
<header class="douban-header douban-animate-in">
  <div>
    <h1 class="douban-title" th:text="${title ?: '豆瓣记录'}">豆瓣记录</h1>
    <p class="douban-subtitle">电影、图书、音乐和游戏收藏</p>
  </div>
  <div th:if="${douban != null}" class="douban-count-pill">
    <strong th:text="${douban.total}">0</strong>
    <span>Items</span>
  </div>
</header>
```

### 筛选区

筛选条分两层：

- 第一层：`types` + `status`，使用紧凑 pill。
- 第二层：`genres`，作为轻量 tag 行，只在有分类时显示。

交互规则：

- 类型按钮链接到 `/douban(type=${type.key}, status=${currentStatus})`。
- 状态按钮保留当前 `type / genre / dataType`。
- 题材按钮保留当前 `type / status / dataType`。
- 移动端横向滚动，不换成抽屉，避免增加 JS。

状态文案建议：

| 参数值  | 展示文案  |
| ------- | --------- |
| `done`  | 已看/已读 |
| `doing` | 在看/在读 |
| `mark`  | 想看/想读 |

如果本地插件实际状态值不同，以路由返回数据为准，不在主题里硬编码未知值。

### 内容卡片

卡片采用海报型网格，比 Equipment 更安静，比 Bangumi 信息更完整。

卡片内容：

- 海报：`spec.poster`
- 评分：`spec.score`
- 标题：`spec.name`
- 年份：`spec.year`
- 类型：`spec.type`
- 副标题：`spec.cardSubtitle`
- 题材：`spec.genres` 前 2-3 个
- 收藏时间：`faves.createTime`
- 备注：`faves.remark` 可作为卡片底部一行，过长截断

不要引用未知字段，例如 `title`、`nameZh`、`ratingText` 这类插件契约里没有确认的字段。

## 响应式

网格建议：

- `<640px`：2 列，`gap: 1rem`
- `640px-1023px`：3 列，`gap: 1.25rem`
- `1024px-1279px`：4 列，`gap: 1.5rem`
- `>=1280px`：5 列，`gap: 1.5rem`

移动端注意：

- 筛选 pill 使用 `overflow-x: auto`。
- 卡片标题最多两行。
- 评分角标和类型角标不要同时堆在同一个角。
- 备注在移动端可以隐藏，避免卡片高度过高。

## 样式草案

```css
.douban-page {
  --douban-card-bg: color-mix(in oklch, var(--color-base-100) 88%, transparent);
  --douban-card-border: color-mix(in oklch, var(--color-base-content) 8%, transparent);
  --douban-card-hover: color-mix(in oklch, var(--color-primary) 18%, transparent);
}

.douban-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
}

.douban-title {
  margin: 0 0 0.5rem;
  color: var(--color-base-content);
  font-size: clamp(1.75rem, 2vw, 2.25rem);
  font-weight: 700;
  line-height: 1.15;
}

.douban-subtitle {
  color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
  font-size: 0.9375rem;
}

.douban-count-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--douban-card-border);
  border-radius: 999px;
  background: color-mix(in oklch, var(--color-base-content) 5%, transparent);
}

.douban-filter-panel {
  margin-bottom: 2rem;
  padding: 0.75rem;
  border: 1px solid var(--douban-card-border);
  border-radius: 1rem;
  background: color-mix(in oklch, var(--color-base-100) 72%, transparent);
  backdrop-filter: blur(16px);
}

.douban-filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.douban-filter-row::-webkit-scrollbar {
  display: none;
}

.douban-filter-item {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 0.625rem;
  color: color-mix(in oklch, var(--color-base-content) 68%, transparent);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.douban-filter-item:hover {
  background: color-mix(in oklch, var(--color-base-content) 6%, transparent);
  color: var(--color-base-content);
}

.douban-filter-item.active {
  background: var(--color-primary);
  color: var(--color-primary-content);
}

.douban-genre-row {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in oklch, var(--color-base-content) 8%, transparent);
}

.douban-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 640px) {
  .douban-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .douban-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1.5rem;
  }
}

@media (min-width: 1280px) {
  .douban-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.douban-card {
  display: block;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.douban-cover {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid var(--douban-card-border);
  border-radius: 0.75rem;
  background: color-mix(in oklch, var(--color-base-content) 6%, transparent);
  box-shadow: var(--art-shadow-md);
}

.douban-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform 0.45s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.45s;
}

.douban-card:hover .douban-cover img {
  filter: brightness(1.04);
  transform: scale(1.045);
}

.douban-score {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  background: color-mix(in oklch, var(--color-primary) 92%, transparent);
  color: var(--color-primary-content);
  font-size: 0.75rem;
  font-weight: 700;
}

.douban-info {
  padding: 0.75rem 0.125rem 0;
}

.douban-name {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--color-base-content);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.9375rem;
  font-weight: 650;
  line-height: 1.35;
}

.douban-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin-top: 0.375rem;
  color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
  font-size: 0.75rem;
}

.douban-remark {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.5rem;
  color: color-mix(in oklch, var(--color-base-content) 52%, transparent);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.8125rem;
  line-height: 1.45;
}

.douban-empty,
.douban-error {
  display: flex;
  min-height: 18rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed color-mix(in oklch, var(--color-base-content) 14%, transparent);
  border-radius: 1rem;
  color: color-mix(in oklch, var(--color-base-content) 48%, transparent);
}

@keyframes douban-fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.douban-animate-in {
  animation: douban-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.douban-stagger-1 {
  animation-delay: 0.06s;
}

.douban-stagger-2 {
  animation-delay: 0.12s;
}

@media (max-width: 639px) {
  .douban-header {
    display: block;
  }

  .douban-count-pill {
    display: none;
  }

  .douban-remark {
    display: none;
  }
}
```

## Thymeleaf 卡片草案

```html
<a
  th:each="item : ${douban.items}"
  th:with="spec=${item.spec}, faves=${item.faves}"
  th:href="${spec?.link}"
  target="_blank"
  rel="noopener noreferrer"
  class="douban-card"
>
  <div class="douban-cover">
    <img
      th:if="${spec != null and !#strings.isEmpty(spec.poster)}"
      th:src="${spec.poster}"
      th:alt="${spec.name}"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
    />
    <span th:if="${spec?.score != null}" class="douban-score" th:text="${spec.score}">9.0</span>
  </div>
  <div class="douban-info">
    <h3 class="douban-name" th:text="${spec?.name ?: '未命名条目'}">未命名条目</h3>
    <div class="douban-meta">
      <span th:if="${spec?.year != null}" th:text="${spec.year}">2024</span>
      <span th:if="${spec?.type != null}" th:text="${spec.type}">movie</span>
      <time th:if="${faves?.createTime != null}" th:text="${#temporals.format(faves.createTime, 'yyyy-MM-dd')}"></time>
    </div>
    <p th:if="${faves?.remark != null}" class="douban-remark" th:text="${faves.remark}">备注</p>
  </div>
</a>
```

## 第一版实现边界

第一版建议只做：

- `/douban` 页面入口。
- 标题、筛选、列表、分页、空状态。
- 使用公开 API 做筛选、列表和分页，避免触发插件路由的空参数懒加载问题。
- CSS 独立为 `douban.css`，由 `src/pages/douban/douban.js` 导入。

暂不做：

- 首页豆瓣模块。
- 自定义详情页。
- TMDB 卡片解析逻辑。
- Masonry 瀑布流。

## 验收标准

- `/douban` 返回 200。
- 页面包含 `douban-page`、`douban-grid`、至少一个筛选区或空状态。
- `type / status / genre` 筛选能触发公开 API 请求。
- 分页按钮保留当前过滤条件。
- PJAX 从首页进入 `/douban` 后样式正常。
- 移动端 `390x844` 无横向页面溢出；只有筛选条允许横向滚动。
