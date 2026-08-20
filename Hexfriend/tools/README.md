# Mausritter 地图工具（CLI + MCP）

目录：`Hexfriend/tools/`

| 文件 | 作用 |
|---|---|
| `cli.mjs` | 地图**生成器**：描述 JSON → `.hexfriend`（战役生成器流程引用） |
| `cli.cjs` | 地图**美化工具**：图标 / 布局 / 预览 / 同步 / 转换 |
| `mcp-server.cjs` | MCP Server（stdio），暴露 8 个工具 |
| `hexmap-core.mjs` | 生成核心库（无依赖，CLI 与 MCP 共用） |
| `icon-svgs.cjs` | 地图图标 SVG 素材库（iconfont.cn 提取，可增改） |

## 依赖

- Node.js ≥ 18
- `sharp`（已在 Hexfriend devDependencies；缺时 `npm i -D sharp --legacy-peer-deps`）
- 浏览器（仅"渲染预览"步骤需要，本地 dev server 起在 5173）

## CLI 用法

### 1. 生成地图（`cli.mjs`）

```bash
npm run map:generate -- 描述.json -o 输出.hexfriend
# 等价于
node tools/cli.mjs 描述.json -o 输出.hexfriend
cat 描述.json | node tools/cli.mjs - -o 输出.hexfriend   # stdin
node tools/cli.mjs --list-terrain   # 列出全部地形 key
node tools/cli.mjs --example        # 输出示例描述 JSON
```

描述 JSON 格式（详见 `战役生成器/战役层/01_六角格地图与定居点.md`）：

```json
{
  "title": "秋烬河谷",
  "orientation": "flatTop",
  "shape": "square",
  "rows": 5,
  "columns": 5,
  "hexes": [
    { "col": 0, "row": 0, "terrain": "forest", "label": "蜂巢", "detail": "银光蜂巢" }
  ]
}
```

### 2. 美化地图（`cli.cjs`，已注册为 npm scripts）

```bash
npm run map:inspect                     # 查看地图摘要（每格图标/编号/位置字号）
npm run map:layout                      # 图标缩放 + 编号下移，解决图标与编号重叠
npm run map:icons                       # 应用内置图标映射（12 个贴合格）
npm run map:svg                         # SVG 素材库转 100x100 PNG（-> /tmp/icons-png.json）
npm run map:sync                        # 同步 3 份地图文件
npm run map:preview                     # 启动预览链路（接收 8900 + 静态 8765）
```

`layout` 可选参数：

| 参数 | 默认 | 说明 |
|---|---|---|
| `--icon-scale` | 0.22 | 图标缩放（22px 居中） |
| `--text-dy` | 16 | 编号文本下移像素（图标正下方） |
| `--text-size` | 14 | 编号字号 |
| `--text-stroke` | 3 | 编号描边宽度 |

`icons` 可覆盖单个格子：`npm run map:icons -- --cell 18:waterfall:瀑布`（`格子号:图标key:显示名`）。

`cli.cjs` 也可直接调用生成：`node tools/cli.cjs generate 描述.json --out 输出.hexfriend`、`node tools/cli.cjs list-terrain`。

### 3. 地图文件约定

**3 份必须同步**：

- `Hexfriend/public/秋烬河谷.hexfriend`（dev server 用 `?map=` 加载）
- `Hexfriend/public/qiujin-river-valley.hexfriend`
- `战役/战役/秋烬河谷.hexfriend`

`layout / icons / sync` 默认同步全部 3 份；传单个文件路径则只改那一份。

### 4. 渲染预览（浏览器步骤）

`map:preview` 只启动服务器，渲染需要浏览器执行 PIXI：

```bash
npm run map:preview    # 起 8900 接收 + 8765 静态
```

浏览器打开 `http://localhost:5173/?map=秋烬河谷.hexfriend`，控制台执行：

```js
const a = globalThis.__PIXI_APP__
a.renderer.render(a.stage)   // 关键！WebGL preserveDrawingBuffer=false，不先渲染取到的是空图
window.__png = a.renderer.view.toDataURL('image/png')
fetch('http://localhost:8900/save', { method: 'POST', body: window.__png })
```

然后查看 `http://localhost:8765/map-preview.png`（产物 `public/map-preview.png`）。

## MCP 用法

项目根 `.mcp.json` 已注册：

```json
{
  "mcpServers": {
    "mausritter-map-tools": {
      "command": "node",
      "args": ["Hexfriend/tools/mcp-server.cjs"],
      "cwd": "/Users/mac/worker/日志/mausritter"
    }
  }
}
```

TRAE 在启动时加载 MCP 配置，新增/修改后需**重载**。若未自动识别，可在 MCP 设置手动添加同一条目。

**工具（8 个）**：

| 工具 | 说明 |
|---|---|
| `generate_hexmap` | 按描述对象生成 `.hexfriend`，返回文件路径 |
| `list_terrain` | 列出生成器支持的地形 key 及显示名 |
| `map_inspect` | 查看地图摘要（每格图标/编号/位置） |
| `map_layout` | 调整图标缩放与编号位置字号（默认同步 3 份） |
| `map_svg_convert` | 把 `icon-svgs.cjs` 的 SVG 转成 PNG base64 |
| `map_apply_icons` | 应用/覆盖格子图标（默认内置 12 个贴合格） |
| `map_sync` | 同步 3 份地图文件 |
| `map_preview_setup` | 启动预览接收服务器（8900），返回渲染指引 |

## 换图标流程（新增/替换贴合图标）

1. 在 iconfont.cn 搜索（无需登录，搜索页图标为内联 SVG），取简单剪影（`outerHTML.length < 4000`，跳过 logo/复杂插画）
2. 将 SVG 追加到 `tools/icon-svgs.cjs`（key 用英文小写下划线，去掉 path 上固定 fill 保持黑色剪影）
3. `npm run map:svg` 转 PNG
4. `npm run map:icons -- --cell <格子号>:<key>:<显示名>` 应用（或更新 `cli.cjs` 内置 cellMap 后 `map:icons`）
5. 浏览器打开地图验证纹理加载（控制台 `Loading Icon Texture with id: iconfont_xxx`），再用 `map:preview` 渲染预览

## 注意事项

- `tools/秋烬河谷.json` 是地图生成源，**不含图标字段**；重新生成地图会丢图标，图标改动只存在于 `.hexfriend` 文件
- 图标集条目即使不再被格子引用也可保留（无副作用）
- 撤销/保存等界面改动遵循代码内直接中文（无翻译系统）
