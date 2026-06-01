# Steam 游戏库页面 (Steam)

> 路径：**外观 → 主题 → Sky Blog → 设置 → Steam**

需安装 Steam 游戏库插件并配置 Steam API Key 和 Steam ID。

**插件信息**：
- 应用市场：[app-0ojqyzfh](https://www.halo.run/store/apps/app-0ojqyzfh)
- GitHub：[plugin-steam](https://github.com/Tim0x0/halo-plugin-steam)

---

## 功能特性

- **游戏库展示**：显示你的 Steam 游戏库
- **游戏统计**：总游戏数、总游玩时长
- **最近游玩**：最近玩的游戏及时长
- **成就展示**：游戏成就完成度
- **侧边栏卡片**：在侧边栏显示 Steam 卡片

---

## 侧边栏小工具

在侧边栏设置中选择 **"Steam 卡片"**，可显示 Steam 游戏信息。

### 卡片内容

- Steam 头像和用户名
- 当前在线状态
- 游戏库统计信息
- 最近游玩的游戏

---

## 页面路由

| 路由 | 模板 | 说明 |
|------|------|------|
| `/steam` | `steam.html` | Steam 游戏库页面 |

---

## 插件配置

> 路径：**后台 → 插件 → Steam 游戏库**

### 必需配置

| 配置项 | 说明 |
|--------|------|
| **Steam API Key** | Steam 开发者 API 密钥 |
| **Steam ID** | 你的 Steam ID（64位） |

### 获取 Steam API Key

1. 访问 [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. 登录 Steam 账号
3. 填写域名后获取 API Key

### 获取 Steam ID

1. 登录 Steam
2. 访问个人资料页
3. 使用 [SteamID Finder](https://www.steamidfinder.com/) 查询
4. 使用 64 位 SteamID（如：76561198012345678）

---

## 技术说明

### 兼容性

- ✅ 支持 Steam 插件 v0.4.0
- ✅ 异步加载游戏数据
- ✅ 字段兼容性处理
- ✅ 当前运行态优先使用 `/apis/api.steam.timxs.com/v1alpha1`，并兼容文档中的 `/apis/api.steam.halo.run/v1alpha1`

### 数据刷新

插件会定期从 Steam API 同步数据，刷新间隔由插件配置控制。

---

## 注意事项

1. **隐私设置**：确保 Steam 个人资料为公开
2. **API 限制**：Steam API 有访问频率限制
3. **网络要求**：需要能访问 Steam API（可能需要代理）
4. **插件依赖**：必须安装并启用 `plugin-steam` 插件
