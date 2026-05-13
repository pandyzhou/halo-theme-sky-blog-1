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

| 批次    | 范围           | 插件                                                                                                         | 当前主题状态                                                         | 验收入口                                                       |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| Batch 0 | 基线与测试闭环 | 全部                                                                                                         | 建立本方案与 smoke 命令                                              | `pnpm lint`、`pnpm build-only`、`pnpm verify:plugins`          |
| Batch 1 | 内容核心页     | Links `v1.7.2`、Photos `v2.1.0`、Moments `v1.16.0`、Friends `v1.4.5`、Docsme 免费版 `1.5.0` / 专业版 `1.6.0` | 已补 Docsme 目录脚本、Moments POST 渲染；Links 当前契约正确，无需查询逻辑改造 | `/links`、`/photos`、`/moments`、`/friends`、`/docs`、`/login` |
| Batch 2 | 扩展内容页     | Bangumi `1.4.0`、Steam `0.3.0`、Equipment `v1.1.1`、Douban `v1.2.5`                                          | Bangumi/Steam/Equipment 已有页面；Douban 待新增主题页                | `/bangumis`、`/steam`、`/equipments`、后续 `/douban`           |
| Batch 3 | 工具链插件     | Search Widget `v1.7.1`、Comment Widget `v3.1.1`、Shiki `v1.3.0`、lightgallery、Text Diagram、Vote            | 已有全局入口、CSS 变量和 PJAX 脚本重放基础                           | 导航搜索、文章评论、文档代码块、图库/瞬间图片                  |
| Batch 4 | 认证与发布链路 | Passkey `v1.0.4`、link-submit、存储插件                                                                      | 登录表单保留 `halo-form`，友链提交已有弹窗；存储依赖瞬间发布真实环境 | `/login`、`/links` 申请弹窗、`/moments` 发布弹窗               |

## 插件契约矩阵

| 插件           | 主题文件                                                                                                              | 数据来源                                                                                      | 关键规则                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Links          | `templates/links.html`、`templates/modules/links/content.html`、`templates/modules/widgets/links.html`                | `/links` 路由变量 `groups`、`linkFinder.groupBy()`、link-submit 匿名 API                      | 友链列表直接消费插件分组模型；`v1.7.2` 只有 `listBy(groupName)` 与 `groupBy()`，首页不伪造批量 limit API |
| Photos         | `templates/photos.html`、`templates/photo.html`、`templates/modules/photos/*`、`src/pages/photos/photos.js`           | `/photos` 路由变量 `photos`、`groups`、`photoUrl`                                             | 详情入口独立于 lightgallery；PJAX 离开时清理 Masonry 和 `IntersectionObserver`                |
| Moments        | `templates/moments.html`、`templates/moment.html`、`templates/modules/moments/*`、`src/pages/moments/*`               | `/moments` 路由变量 `moments`、`tags`、`moment`                                               | 媒体渲染消费 `moment.spec.content`，覆盖 `PHOTO/VIDEO/AUDIO/POST`；前端发布走 Halo UC 附件 API 和插件公开 API |
| Friends        | `templates/friends.html`、`templates/modules/friends/content.html`                                                    | `/friends` 路由变量 `friends`、`title`                                                        | 不重复实现 RSS 抓取；分页与筛选交给插件路由                                                   |
| Docsme         | `templates/docs.html`、`templates/doc.html`、`templates/doc-catalog.html`、`templates/modules/doc*`                   | Docsme 页面模型、官方片段、`docsmeProjectsFinder`                                             | 免费版按 `1.5.0`，专业版按 `1.6.0`；`doc.html` 与 `doc-catalog.html` 均引入 `plugin-scripts` |
| Bangumi        | `templates/bangumis.html`、`templates/modules/bangumi/*`、`src/pages/bangumi/*`                                       | `/bangumis` 路由变量 `bangumis`、`bangumiFinder`                                              | 主题只渲染分页结果，不重建抓取逻辑                                                            |
| Steam          | `templates/steam.html`、`templates/modules/steam/*`、`src/pages/steam/*`、`templates/modules/widgets/steam-card.html` | 插件 REST API、可选 `steamFinder`                                                             | 前端 API 调用必须有错误态和缓存；Finder 使用时要判空                                          |
| Equipment      | `templates/equipments.html`、`templates/modules/equipments/*`、`src/pages/equipment/*`                                | `/equipments` 路由变量 `groups`、`equipmentFinder`、插件片段 `plugin:equipment:modules/style` | `v1.1.1` 新增公开 API，但 Thymeleaf 页面仍优先使用路由模型                                    |
| Douban         | 待新增 `templates/douban.html`、`templates/modules/douban/*`、`src/pages/douban/*`                                    | `/douban` 路由变量 `douban`、`genres`、`types`、`doubanFinder`                                | 第一版先做列表/筛选/分页；`types` 接口只作为增强能力                                          |
| Search Widget  | `templates/modules/nav.html`、`src/common/css/base.css`                                                               | `SearchWidget.open()`                                                                         | 只在 `pluginFinder.available('PluginSearchWidget')` 时显示入口                                |
| Comment Widget | 各页面 `<halo:comment>`                                                                                               | Halo 评论组件                                                                                 | 评论 subject 必须使用对应插件 group/kind/name                                                 |
| Shiki          | 文章页/文档页内容区                                                                                                   | 插件 head 注入与内容处理                                                                      | 主题只处理暗亮色和 PJAX 后渲染，不引入新的代码高亮库                                          |
| Passkey        | `templates/login.html`、`templates/gateway_fragments/login.html`                                                      | 插件认证提供者片段                                                                            | 登录表单必须保留 `.halo-form` 和动态 `fragmentTemplateName`                                   |

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

### 浏览器人工验收

- 桌面和移动端各看一次插件页布局。
- 从首页或导航进入插件页，再 PJAX 返回上一个插件页。
- 打开暗色模式，确认 Search、Comment、Shiki、lightgallery 颜色不漂移。
- 对 Photos、Moments、Docsme 这类含富文本/图片/评论的页面，确认脚本只初始化一次。

## 下一批实施顺序

1. Batch 1 先做回归：`/links`、`/photos`、`/moments`、`/friends`、`/docs`、`/login` 全部 smoke 和浏览器复验。
2. Batch 2 新增 Douban 页面，再顺手回归 Bangumi、Steam、Equipment。
3. Batch 3 集中处理工具链插件：搜索弹窗、评论组件、Shiki 代码块、lightgallery PJAX 重放。
4. Batch 4 专门测登录/Passkey、友链申请和瞬间发布上传，避免和普通展示页混在一起。
