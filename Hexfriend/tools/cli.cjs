// Mausritter 战役地图工具 CLI
// 用法: node tools/cli.cjs <子命令> [选项]
//   子命令:
//     inspect  [mapfile]                打印地图摘要（图标/文本/布局）
//     layout   [mapfile] [--icon-scale 0.22] [--text-dy 16] [--text-size 14] [--text-stroke 3]
//                                       调整图标大小与编号文本位置（默认同步 3 份文件）
//     svg-convert [key...]              SVG 素材库转 100x100 PNG -> /tmp/icons-png.json
//     icons    [mapfile] [--cell 18:waterfall]   应用图标映射到地图（默认同步 3 份）
//     sync     [from]                   把主地图文件同步到另外两份
//     preview  [--serve]                启动预览接收服务器(8900)，--serve 额外起静态服务器(8765)
const fs = require('fs')
const path = require('path')
const http = require('http')

const ROOT = path.resolve(__dirname, '..') // Hexfriend/
const PUB = path.join(ROOT, 'public')
const MAP_FILES = [
  path.join(PUB, '秋烬河谷.hexfriend'),
  path.join(PUB, 'qiujin-river-valley.hexfriend'),
  path.join('/Users/mac/worker/日志/mausritter/战役/战役', '秋烬河谷.hexfriend'),
]
const HEX_H = 43.3
const PNG_JSON = '/tmp/icons-png.json'

// 默认图标映射：格子编号(1-25) -> 图标库 key
const cellMap = {
  1: { key: 'beehive', display: '蜂巢' },
  2: { key: 'flower_cluster', display: '花丛' },
  3: { key: 'tree', display: '橡树' },
  4: { key: 'wheat', display: '麦穗' },
  6: { key: 'willow', display: '垂柳' },
  8: { key: 'stump', display: '树桩' },
  14: { key: 'termite', display: '白蚁' },
  18: { key: 'waterfall', display: '瀑布' },
  19: { key: 'stone_circle', display: '石环' },
  22: { key: 'reed', display: '芦苇' },
  23: { key: 'car', display: '汽车' },
  24: { key: 'pipe', display: '水管' },
}

function readMap(file) { return JSON.parse(fs.readFileSync(file, 'utf8')) }
function writeMap(file, d) { fs.writeFileSync(file, JSON.stringify(d)) }

/** SVG 素材库 -> 100x100 PNG base64，写入 /tmp/icons-png.json */
async function svgConvert(onlyKeys) {
  const sharp = require('sharp')
  const svgs = require('./icon-svgs.cjs')
  const keys = onlyKeys && onlyKeys.length ? onlyKeys : Object.keys(svgs)
  const out = {}
  for (const key of keys) {
    if (!svgs[key]) continue
    const png = await sharp(Buffer.from(svgs[key]))
      .resize(100, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    out[key] = { base64: 'data:image/png;base64,' + png.toString('base64'), bytes: png.length, w: 100, h: 100 }
  }
  fs.writeFileSync(PNG_JSON, JSON.stringify(out, null, 1))
  return Object.keys(out)
}

function loadPngs() {
  if (!fs.existsSync(PNG_JSON)) svgConvertSync()
  return JSON.parse(fs.readFileSync(PNG_JSON, 'utf8'))
}
function svgConvertSync(keys) {
  // 简单同步包装（svgConvert 内部全是 await，这里用 exec 兜底不必要，直接复用 async 即可）
  return svgConvert(keys)
}

/** 打印地图摘要 */
function inspect(mapFile) {
  const d = readMap(mapFile)
  const out = []
  out.push(`标题: ${d.title} | 格子: ${Object.keys(d.TerrainField.hexes).length} | 图标: ${d.icons.length} | 文本: ${d.texts.length}`)
  for (let i = 0; i < d.icons.length; i++) {
    const ic = d.icons[i]
    const t = d.texts[i]
    out.push(`${i + 1}. ${ic.display}(${ic.texId}) scale=${ic.scale && ic.scale.x.toFixed(3)} pHex=${ic.pHex} | 文本="${t.text}" x=${t.x} y=${t.y} 字号=${t.style.fontSize}`)
  }
  return out.join('\n')
}

/** 布局调整：图标缩放 + 编号文本下移/缩小 */
function layout(mapFile, opts) {
  const { iconScale = 0.22, textDy = 16, textSize = 14, textStroke = 3 } = opts
  const pHex = Math.round((iconScale * 100 * 100) / HEX_H)
  const files = mapFile ? [mapFile] : MAP_FILES
  const results = []
  for (const file of files) {
    const d = readMap(file)
    for (const ic of d.icons) {
      ic.scale = { x: iconScale, y: iconScale }
      ic.pHex = pHex
    }
    for (const t of d.texts) {
      t.y += textDy
      t.style.fontSize = textSize
      t.style.strokeThickness = textStroke
    }
    writeMap(file, d)
    results.push(`${path.basename(file)}: ${d.icons.length} 图标 scale=${iconScale} pHex=${pHex}；${d.texts.length} 文本下移${textDy} 字号${textSize}`)
  }
  return results.join('\n')
}

/** 应用图标映射（默认内置 cellMap，可用 --cell 覆盖/追加） */
function applyIcons(mapFile, extraCells) {
  const pngs = loadPngs()
  const map = { ...cellMap, ...extraCells }
  const files = mapFile ? [mapFile] : MAP_FILES
  const results = []
  for (const file of files) {
    const d = readMap(file)
    const iconset = d.iconsets[0]
    let changed = 0
    for (const cellNo of Object.keys(map)) {
      const cell = d.icons[Number(cellNo) - 1]
      if (!cell) continue
      const { key, display } = map[cellNo]
      const p = pngs[key]
      if (!p) { results.push(`缺少 ${key} 的 PNG，先运行 svg-convert`); continue }
      cell.base64 = p.base64
      cell.texWidth = p.w
      cell.texHeight = p.h
      cell.id = 'iconfont_' + key
      cell.texId = 'iconfont_' + key
      cell.display = display
      cell.color = 0
      cell.rotation = 0
      let entry = iconset.icons.find((i) => i.texId === cell.texId)
      if (!entry) {
        iconset.icons.push({ display, texId: cell.texId, id: cell.texId, color: 0, pHex: 51, base64: p.base64, preview: p.base64, texWidth: p.w, texHeight: p.h, scaleMode: 'relative', rotation: 0 })
      } else {
        entry.base64 = p.base64
        entry.preview = p.base64
        entry.texWidth = p.w
        entry.texHeight = p.h
      }
      changed++
    }
    writeMap(file, d)
    results.push(`${path.basename(file)}: 应用 ${changed} 个图标，图标集 ${iconset.icons.length} 条目`)
  }
  return results.join('\n')
}

/** 同步地图文件：from 复制到其余两份 */
function sync(fromFile) {
  if (!fromFile) fromFile = MAP_FILES[0]
  const data = fs.readFileSync(fromFile)
  const others = MAP_FILES.filter((f) => f !== fromFile)
  for (const f of others) fs.writeFileSync(f, data)
  return `已从 ${path.basename(fromFile)} 同步到: ${others.map((f) => path.basename(f)).join(', ')}`
}

/** 预览接收服务器（8900）：接收浏览器 POST 的 PNG，存到 public/map-preview.png */
function previewSetup(serveStatic) {
  const OUT = path.join(PUB, 'map-preview.png')
  const recv = http
    .createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' })
        return res.end()
      }
      if (req.method === 'POST' && req.url === '/save') {
        let data = ''
        req.on('data', (c) => (data += c))
        req.on('end', () => {
          const b64 = data.replace(/^data:image\/png;base64,/, '').trim()
          fs.writeFileSync(OUT, Buffer.from(b64, 'base64'))
          console.log('[preview] 已保存', OUT)
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*' })
          res.end('ok')
        })
        return
      }
      res.writeHead(404)
      res.end()
    })
    .listen(8900, () => console.log('[preview] 接收服务器 8900 就绪'))

  if (serveStatic) {
    const { exec } = require('child_process')
    exec(`python3 -m http.server 8765 --directory "${PUB}"`, { cwd: ROOT })
    console.log('[preview] 静态服务器 8765 就绪，预览地址 http://localhost:8765/map-preview.png')
  }
  console.log('[preview] 渲染指引：浏览器打开 http://localhost:5173/?map=秋烬河谷.hexfriend，执行')
  console.log('  window.__png=await globalThis.__hexfriend_export_png();')
  console.log('  fetch("http://localhost:8900/save",{method:"POST",body:window.__png})')
  console.log('  然后打开 http://localhost:8765/map-preview.png 查看（已按地图内容自动裁剪，无多余透明留白）')
  return recv
}

// ---- CLI 入口 ----
function main() {
  const args = process.argv.slice(2)
  const cmd = args[0]
  const rest = args.slice(1)
  const opt = {}
  const positional = []
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) {
      const k = rest[i].slice(2)
      const v = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true
      opt[k] = v
    } else positional.push(rest[i])
  }

  const run = async () => {
    switch (cmd) {
      case 'inspect': {
        const file = positional[0] || MAP_FILES[0]
        console.log(inspect(file))
        break
      }
      case 'layout': {
        console.log(layout(positional[0], {
          iconScale: opt['icon-scale'] !== undefined ? Number(opt['icon-scale']) : 0.22,
          textDy: opt['text-dy'] !== undefined ? Number(opt['text-dy']) : 16,
          textSize: opt['text-size'] !== undefined ? Number(opt['text-size']) : 14,
          textStroke: opt['text-stroke'] !== undefined ? Number(opt['text-stroke']) : 3,
        }))
        break
      }
      case 'svg-convert': {
        const keys = positional.length ? positional : undefined
        const done = await svgConvert(keys)
        console.log(`已转换: ${done.join(', ')} -> ${PNG_JSON}`)
        break
      }
      case 'icons': {
        const extra = {}
        for (const k of Object.keys(opt)) if (k.startsWith('cell:')) {
          const cellNo = k.split(':')[1]
          const v = String(opt[k])
          const [key, display] = v.split(':')
          extra[cellNo] = { key, display: display || key }
        }
        console.log(applyIcons(positional[0], extra))
        break
      }
      case 'sync':
        console.log(sync(positional[0]))
        break
      case 'generate': {
        // 生成新地图：描述 JSON -> .hexfriend（复用 hexmap-core.mjs）
        const input = positional[0]
        if (!input) { console.log('用法: generate <描述.json> [--out 输出.hexfriend]'); break }
        const desc = JSON.parse(fs.readFileSync(input, 'utf8'))
        const core = await import('./hexmap-core.mjs')
        const saveData = core.generateSaveData(desc)
        const out = opt.out ? String(opt.out) : path.join(__dirname, `${(desc.title || 'map').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')}.hexfriend`)
        fs.writeFileSync(out, JSON.stringify(saveData, null, 2))
        console.log(`已生成 ${out} | 格子: ${Object.keys(saveData.TerrainField.hexes).length} | 文本: ${saveData.texts.length}`)
        break
      }
      case 'list-terrain': {
        const core = await import('./hexmap-core.mjs')
        console.log(Object.entries(core.DEFAULT_TERRAIN).map(([k, d]) => `${k}（${d.display}）`).join('、'))
        break
      }
      case 'preview':
        previewSetup(opt.serve !== undefined)
        break
      default:
        console.log('未知子命令: ' + cmd)
        console.log('用法见文件头注释')
    }
  }
  run()
}

module.exports = { inspect, layout, svgConvert, applyIcons, sync, previewSetup, MAP_FILES, cellMap, readMap, writeMap }

if (require.main === module) main()
