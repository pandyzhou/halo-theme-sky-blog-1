# 插件分批适配方案

本文档记录当前主题的 Halo 插件适配批次、版本基线、主题侧边界和测试入口。插件版本以本地 Halo plugin skills 中的版本审查结果为准，并在每批改动前重新核对 GitHub Release / Halo 应用市场。

## 适配原则

- 主题优先消费插件已经提供的前台路由变量、Finder 和官方模板片段。
- 只有插件明确提供公开 REST API 且主题需要前端动态交互时，才在浏览器端调用 API。
- 所有独立插件页都必须挂到当前主题的公共 PJAX 合约：`#swup`、`#swup-scripts`、`data-swup-reload-script`。
- 插件页面的脚本必须能在 PJAX 返回时重新初始化，并在离开页面时清理监听器、observer、定时器。
- 工具类插件只做主题集成和样式变量适配，不伪造 Finder 或后端接口。
- 对应主题模板必须在入口处保留“兼容基线”注释，写明当前适配的插件版本、路由变量或 Finder/API 契约。

## 当前批次

| 批次    | 范围           | 插件                                                                                                         | 当前主题状态                                                                                       | 验收入口                                                       |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Batch 0 | 基线与测试闭环 | 全部                                                                                                         | 建立本方案、基础 smoke 和深度 smoke 命令                                                           | `pnpm lint`、`pnpm build-only`、`pnpm verify:plugins`          |
| Batch 1 | 内容核心页     | Links `v1.7.2`、Photos `v2.1.0`、Moments `v1.16.0`、Friends `v1.4.5`、Docsme 免费版 `1.5.0` / 专业版 `1.6.0` | 已补 Docsme 目录脚本与 0 篇文档项目禁用态、Moments POST 渲染；Links 当前契约正确，无需查询逻辑改造 | `/links`、`/photos`、`/moments`、`/friends`、`/docs`、`/login` |
| Batch 2 | 扩展内容页     | Bangumi `1.4.0`、Steam `0.3.0`、Equipment `v1.1.1`、Douban `v1.2.5`                                          | Bangumi/Steam/Equipment 已有页面；Douban 已接入第一版海报网格页面                                  | `/bangumis`、`/steam`、`/equipments`、`/douban`                |
| Batch 3 | 工具链插件     | Search Widget `v1.7.1`、Comment Widget `v3.1.1`、Shiki `v1.3.0`、lightgallery、Text Diagram、Vote            | 已完成当前 Chrome 实看；深度 smoke 覆盖搜索入口、评论脚本、Shiki 注入和 lightgallery 绑定          | 导航搜索、文章评论、文档代码块、图库/瞬间图片                  |
| Batch 4 | 认证与发布链路 | Passkey `v1.0.4`、link-submit、存储插件                                                                      | 登录表单保留 `halo-form`，友链提交弹窗已补评论留言兜底；Alist 标记为不可用                         | `/login`、`/links` 申请弹窗、`/moments` 发布弹窗               |

## 插件契约矩阵

| 插件           | 主题文件                                                                                                              | 数据来源                                                                                      | 关键规则                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Links          | `templates/links.html`、`templates/modules/links/content.html`、`templates/modules/widgets/links.html`                | `/links` 路由变量 `groups`、`linkFinder.groupBy()`、link-submit 匿名 API                      | 友链列表直接消费插件分组模型；`v1.7.2` 只有 `listBy(groupName)` 与 `groupBy()`，首页不伪造批量 limit API；提交接口不可用时切换评论留言兜底 |
| Photos         | `templates/photos.html`、`templates/photo.html`、`templates/modules/photos/*`、`src/pages/photos/photos.js`           | `/photos` 路由变量 `photos`、`groups`、`photoUrl`                                             | 详情入口独立于 lightgallery；PJAX 离开时清理 Masonry 和 `IntersectionObserver`                                                             |
| Moments        | `templates/moments.html`、`templates/moment.html`、`templates/modules/moments/*`、`src/pages/moments/*`               | `/moments` 路由变量 `moments`、`tags`、`moment`                                               | 媒体渲染消费 `moment.spec.content`，覆盖 `PHOTO/VIDEO/AUDIO/POST`；前端发布走 Halo UC 附件 API 和插件公开 API                              |
| Friends        | `templates/friends.html`、`templates/modules/friends/content.html`                                                    | `/friends` 路由变量 `friends`、`title`                                                        | 不重复实现 RSS 抓取；分页与筛选交给插件路由                                                                                                |
| Docsme         | `templates/docs.html`、`templates/doc.html`、`templates/doc-catalog.html`、`templates/modules/doc*`                   | Docsme 页面模型、官方片段、`docsmeProjectsFinder`                                             | 免费版按 `1.5.0`，专业版按 `1.6.0`；`doc.html` 与 `doc-catalog.html` 均引入 `plugin-scripts`；项目列表仅对 `totalDocs > 0` 生成详情链接    |
| Bangumi        | `templates/bangumis.html`、`templates/modules/bangumi/*`、`src/pages/bangumi/*`                                       | `/bangumis` 路由变量 `bangumis`、`bangumiFinder`                                              | 主题只渲染分页结果，不重建抓取逻辑                                                                                                         |
| Steam          | `templates/steam.html`、`templates/modules/steam/*`、`src/pages/steam/*`、`templates/modules/widgets/steam-card.html` | 插件 REST API、可选 `steamFinder`                                                             | 前端 API 调用必须有错误态和缓存；Finder 使用时要判空                                                                                       |
| Equipment      | `templates/equipments.html`、`templates/modules/equipments/*`、`src/pages/equipment/*`                                | `/equipments` 路由变量 `groups`、`equipmentFinder`、插件片段 `plugin:equipment:modules/style` | `v1.1.1` 新增公开 API，但 Thymeleaf 页面仍优先使用路由模型                                                                                 |
| Douban         | `templates/douban.html`、`templates/modules/douban/*`、`src/pages/douban/*`                                           | `/douban` 页面壳 + 公开 API `/apis/api.douban.moony.la/v1alpha1/doubanmovies`                 | `v1.2.5` 默认路由懒加载 `douban` 变量在空筛选参数下会触发插件侧 NPE；主题第一版避免触发该变量，改用公开 API 渲染海报网格                   |
| Search Widget  | `templates/modules/nav.html`、`src/common/css/base.css`                                                               | `SearchWidget.open()`                                                                         | 只在 `pluginFinder.available('PluginSearchWidget')` 时显示入口                                                                             |
| Comment Widget | 各页面 `<halo:comment>`                                                                                               | Halo 评论组件                                                                                 | 评论 subject 必须使用对应插件 group/kind/name                                                                                              |
| Shiki          | 文章页/文档页内容区                                                                                                   | 插件 head 注入与内容处理                                                                      | 主题只处理暗亮色和 PJAX 后渲染，不引入新的代码高亮库                                                                                       |
| Passkey        | `templates/login.html`、`templates/gateway_fragments/login.html`                                                      | 插件认证提供者片段                                                                            | 登录表单必须保留 `.halo-form` 和动态 `fragmentTemplateName`                                                                                |
| Alist 存储     | 文档标记；瞬间发布使用 Halo UC 附件 API                                                                               | `plugin-alist` 附件存储策略                                                                   | 当前主题直接标记不可用；不作为 Moments 上传后端，也不安排真实上传复测                                                                      |

## 每批测试标准

### 静态门禁

```bash
pnpm lint
pnpm build-only
```

### 本地 Halo smoke

默认检查 `http://localhost:8090`：

```bash
pnpm verify:plugins
```

如本地 Halo 不在默认端口：

```bash
SMOKE_BASE_URL=http://localhost:8091 pnpm verify:plugins
```

脚本会检查核心插件页是否返回 `200`，并验证页面中存在对应主题标记。详情页属于数据依赖路由，使用下面的环境变量加入检查：

```bash
PHOTO_DETAIL_URL=/photos/{photoName} MOMENT_DETAIL_URL=/moments/{momentName} DOC_DETAIL_URL=/docs/{project}/{doc} pnpm verify:plugins
```

深度 smoke 会额外检查首页插件组件、Docsme 目录页、文章代码块 Shiki、评论组件、搜索组件、Moments lightgallery、作者页 Moments 区块和 Douban 真实题材接口：

```bash
pnpm verify:plugins:deep
```

深度 smoke 的默认路径按当前本地测试数据设置。其他站点可通过 `HOME_URL`、`DOC_CATALOG_URL`、`ARTICLE_CODE_URL`、`COMMENT_PAGE_URL`、`SEARCH_PAGE_URL`、`LIGHTGALLERY_PAGE_URL`、`AUTHOR_URL` 覆盖。Douban 题材接口属于数据级检查，要求当前站点已有至少一个题材数据；没有同步豆瓣数据的环境只运行基础 smoke。

### 浏览器人工验收

- 桌面和移动端各看一次插件页布局。
- 从首页或导航进入插件页，再 PJAX 返回上一个插件页。
- 打开暗色模式，确认 Search、Comment、Shiki、lightgallery 颜色不漂移。
- 对 Photos、Moments、Docsme 这类含富文本/图片/评论的页面，确认脚本只初始化一次。
- Passkey 真实登录、Moments 真实发布和上传属于带状态操作；如果主题模板未修改，优先复用站点手工验收结果，不在自动脚本里写入内容或改变认证状态。

### 当前浏览器验收记录

2026-05-13 在本地 Halo `http://localhost:8090` 用真实浏览器完成以下不改数据的交互复验：

| 项目              | 验收入口                                                               | 结果                                                          |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| PJAX 页面切换     | `/` → `/moments` → `/docs`                                             | URL、标题和页面主体按预期切换，`window.SkyPjax` 可用          |
| Docsme 目录到详情 | `/docs/halo-theme-sky-blog-1/theme-settings` → `theme-settings/global` | 目录页和子文档均可打开，评论区域正常出现                      |
| Search Widget     | 首页搜索按钮 / `SearchWidget.open()`，关键词 `Halo` / `测试`           | `PluginSearchWidget v1.7.1` 注入；弹窗、输入框、结果/空态可用 |
| Shiki             | `/archives/editor-feature-demo`                                        | 页面存在 `shiki-code`，代码块由 `plugin-shiki v1.3.0` 接管    |
| Comment Widget    | `/archives/editor-feature-demo`、Docsme 文档详情                       | 评论区域文案出现，插件脚本注入正常                            |
| lightgallery      | `/moments`                                                             | 点击瞬间图片后 lightgallery 容器打开                          |
| 暗色切换          | 首页顶部主题按钮                                                       | `html[data-color-scheme]` 可从 `dark` 切到 `light`            |
| 移动端基础布局    | 首页 `390x844` 视口                                                    | 无横向溢出，首页插件模块仍可见                                |

Search Widget 进一步输入复验时，插件搜索接口 `/apis/api.halo.run/v1alpha1/indices/-/search` 能正常返回结果；当前本地索引包含 `/archives/hello-halo`、`/archives/ce-shi` 等已不存在文章，点击会进入 404。该问题属于本地搜索索引/内容数据需要重建，不是主题模板适配缺口。

浏览器控制台出现过天气服务外部接口 504 / fallback 日志，属于天气数据源降级，不属于本轮插件适配阻塞项。

Douban 封面图片当前由 `spec.poster` 提供。如果插件返回 `img*.doubanio.com` 直链，浏览器可能收到远端 `418`；主题只做加载失败占位兜底，真实封面显示应在 `plugin-douban` 设置中启用 `isProxy / proxyHost`，不要在主题里硬编码第三方代理。

## 剩余事项

1. 继续保留基础 smoke、深度 smoke 与浏览器验收三层验证，避免把数据依赖页面塞进默认命令导致普通本地环境误报。
2. Bangumi、Steam、Equipment、Douban 维持现有页面回归；Douban 当前按公开 API 验收海报网格、筛选、分页与空态。
3. Alist 存储直接标记不可用，不再安排真实上传复测；Moments 上传使用本地存储或 S3。
4. Passkey 真实登录、Moments 真实发布/上传属于会改变认证或内容状态的流程，只在需要改认证或发布模板时重新跑完整手测。
5. 天气外部接口偶发 504 会污染浏览器控制台，需要后续单独做数据源超时/降级噪声治理。
6. 多 Halo / 多插件版本矩阵需要额外环境；本轮只确认当前本地 Halo 与当前插件集。
