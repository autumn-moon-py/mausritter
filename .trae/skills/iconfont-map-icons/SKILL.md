---
name: "iconfont-map-icons"
description: "从 iconfont.cn 搜集贴合地点语义的地图图标（SVG 剪影），转换为 PNG base64 保存到项目，并替换 Hexfriend 地图格子图标。当用户要求换/找更贴合的图标、从 iconfont 搜图标、给地图格子补图标、地图图标美化时调用。"
---

# iconfont 地图图标搜集与保存

把"从 iconfont.cn 找贴合图标 → 存进项目 → 替换 Hexfriend 地图格子图标"的完整流程固化为可复用步骤，避免每次手动操作。

## 适用场景
- 用户说"图标不够贴合，去 iconfont 找""换个更贴合的图标""给地图格子补图标""地图图标美化"
- 需要给新战役地图批量补充贴合地点的图标

## 环境与关键文件
- 项目根：`/Users/mac/worker/日志/mausritter`
- Hexfriend 前端：`Hexfriend/`（dev server：`http://localhost:5173/?map=秋烬河谷.hexfriend`）
- 地图文件（**3 份必须同步**）：
  - `Hexfriend/public/秋烬河谷.hexfriend`
  - `Hexfriend/public/qiujin-river-valley.hexfriend`
  - `战役/战役/秋烬河谷.hexfriend`
- SVG 素材库：`Hexfriend/tools/icon-svgs.cjs`（每个图标一个 SVG 字符串，key 用英文小写下划线，注释标注格子/地点）
- 转换脚本：`Hexfriend/tools/svg-to-png.cjs`（sharp 转 100x100 PNG，输出 `/tmp/icons-png.json`）
- 应用脚本：`Hexfriend/tools/apply-icons.cjs`（按格子映射批量替换 + 同步图标集 + 写 3 份文件）
- sharp 依赖：装在 `/tmp/svgconv`（`npm install sharp --prefix /tmp/svgconv`，若缺先装）
- 预览接收服务器：`Hexfriend/tools/recv.cjs`（node 启动监听 8900，把浏览器 POST 的 PNG 存到 `public/map-preview.png`）

## 地图数据结构（改动前先确认）
- 顶层 `icons[]`（25 个，每格一个）：字段 `{id, texId, display, color, pHex, base64, preview, texWidth, texHeight, scaleMode, rotation, onLayerId, x, y, scale}`，**每格自带完整 base64**
- `iconsets[0].icons[]`：图标库（面板显示用），被引用的 texId 必须存在
- 渲染用 `icons[i].scale`；图标缩放比例由 `scale = (hexHeight 43.3 × pHex/100) / texHeight` 决定

## 流程

### 1. 搜索并提取 SVG（browser_use 子代理）
访问 `https://www.iconfont.cn/search/index?searchType=icon&q=<URL编码关键词>`
- 无需登录；搜索页图标是内联 SVG：`document.querySelectorAll('.icon-twrap svg')`（viewBox 1024x1024，完整 path）
- 图标名称：`.icon-name` 的 title 或 innerText
- 筛选标准：**简单剪影/线稿**，`svg.outerHTML.length < 4000`；跳过品牌 logo（如"蚂蚁花呗""xxxlogo"）、文字图标、复杂插画；每词取 1 个最贴合
- 让子代理返回 name + **完整** svg outerHTML（勿截断）

### 2. 保存 SVG 到项目
追加到 `Hexfriend/tools/icon-svgs.cjs`：
- key 用英文小写下划线（如 `flower_cluster`），注释注明对应格子/地点
- 清理：去掉 path 上固定的 `fill="#xxxxxx"` 属性（保持黑色剪影，随地图配色）

### 3. 转 PNG
```bash
cd Hexfriend && node tools/svg-to-png.cjs
```
输出 `/tmp/icons-png.json`：`{key: {base64:'data:image/png;base64,...', bytes, w:100, h:100}}`

### 4. 应用到地图
编辑 `Hexfriend/tools/apply-icons.cjs` 的 `cellMap`（格子编号 1-25 → `{key, display}`），执行：
```bash
cd Hexfriend && node tools/apply-icons.cjs
```
脚本自动：更新顶层 `icons[N-1]` 的 base64/texWidth/texHeight/id/texId/display/color；同步 `iconsets[0].icons`（不存在则新增）；写回 3 份地图文件。

### 5. 浏览器验证
打开 `http://localhost:5173/?map=秋烬河谷.hexfriend`，确认：
- 控制台出现 `Loading Icon Texture with id: iconfont_xxx`，无红色报错
- 图标面板显示新图标名与预览

### 6. 渲染预览 PNG（给用户看图）
- 启动接收服务器：`cd Hexfriend && node tools/recv.cjs`（8900）
- browser_use 子代理打开地图页后执行 evaluate（**关键：WebGL 的 `preserveDrawingBuffer=false`，直接 `toDataURL()` 只会拿到透明空图，必须先在同一个同步块里 `renderer.render(stage)` 强制刷新缓冲再取图**）：
  1. `const a=globalThis.__PIXI_APP__; a.renderer.render(a.stage); window.__png=a.renderer.view.toDataURL('image/png'); 'len='+window.__png.length`
  2. 校验：`window.__png.length` 应 > 50000（约 100KB+），太小说明拿到空图，重试
  3. `fetch('http://localhost:8900/save', {method:'POST', body: window.__png, headers:{'Content-Type':'text/plain'}}).then(r=>r.text())` 返回 `ok`
- 产物：`Hexfriend/public/map-preview.png`，用静态服务器（如 `python3 -m http.server 8765 --directory public`）即可打开预览

## 布局规范（图标与编号不重叠）
- 图标：居中，`scale = 0.22`（约 22px），`pHex = 51`
- 编号文本：`fontSize 14`、`strokeThickness 3`、白字黑描边，位置 = 格子中心 y + 16（图标正下方）
- 一键应用：`Hexfriend/tools/fix-layout.cjs`（会重设所有格子）

## 注意
- 牛头骨等 iconfont 无合适剪影时，如实告知用户并保留原图标，不要硬换
- `tools/秋烬河谷.json` 生成源不含图标字段，重新生成地图会丢图标；图标改动只存在于 .hexfriend 文件
- 图标面板中旧图标条目保留即可（无引用也无害），不必清理
