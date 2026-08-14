// Mausritter 地图工具 MCP Server（stdio JSON-RPC，MCP 2024-11-05）
// 注册：项目根 .mcp.json -> { "command": "node", "args": ["Hexfriend/tools/mcp-server.cjs"] }
const readline = require('readline')
const fs = require('fs')
const path = require('path')
const cli = require('./cli.cjs')

const SERVER_INFO = { name: 'mausritter-map-tools', version: '1.0.0' }
const PROTOCOL_VERSION = '2024-11-05'

const tools = [
  {
    name: 'map_inspect',
    description: '读取 Hexfriend 地图文件，返回标题、格子数、每个格子的图标(texId/display/scale/pHex)与编号文本(内容/位置/字号)摘要。用于查看地图当前状态。',
    inputSchema: {
      type: 'object',
      properties: { map_file: { type: 'string', description: '地图文件路径，省略则用默认秋烬河谷地图' } },
    },
  },
  {
    name: 'map_layout',
    description: '调整地图布局：图标缩放（scale 0.22≈22px 居中）与编号文本（默认下移 y+16、字号14、描边3），解决图标与编号重叠问题。默认同步更新 3 份地图文件。',
    inputSchema: {
      type: 'object',
      properties: {
        map_file: { type: 'string', description: '只改这一份文件时传路径；省略则同步 3 份' },
        icon_scale: { type: 'number', description: '图标缩放比例，默认 0.22' },
        text_dy: { type: 'number', description: '编号文本下移像素，默认 16' },
        text_size: { type: 'number', description: '编号字号，默认 14' },
        text_stroke: { type: 'number', description: '编号描边宽度，默认 3' },
      },
    },
  },
  {
    name: 'map_svg_convert',
    description: '把 tools/icon-svgs.cjs 里的 SVG 素材转成 100x100 PNG base64，写入 /tmp/icons-png.json。可指定 key 只转部分。',
    inputSchema: {
      type: 'object',
      properties: {
        keys: { type: 'array', items: { type: 'string' }, description: '要转换的图标 key 列表；省略则全量转换' },
      },
    },
  },
  {
    name: 'map_apply_icons',
    description: '把图标应用到地图格子（更新顶层 icons 与图标集，默认同步 3 份）。默认使用内置映射（蜂巢/花丛/橡树/麦穗/垂柳/树桩/白蚁/瀑布/石环/芦苇/汽车/水管），可用 cells 参数覆盖。',
    inputSchema: {
      type: 'object',
      properties: {
        map_file: { type: 'string', description: '只改这一份文件时传路径；省略则同步 3 份' },
        cells: {
          type: 'object',
          description: '格子映射覆盖，格式 {"格子号": "图标key:显示名"}，如 {"18": "waterfall:瀑布"}',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
  {
    name: 'map_sync',
    description: '把主地图文件（public/秋烬河谷.hexfriend）同步复制到其余两份（public/qiujin-river-valley.hexfriend 与 战役/秋烬河谷.hexfriend）。',
    inputSchema: {
      type: 'object',
      properties: { from: { type: 'string', description: '源文件路径，默认主文件' } },
    },
  },
  {
    name: 'map_preview_setup',
    description: '启动地图预览链路：接收服务器(8900)接收浏览器渲染的 PNG 存到 public/map-preview.png；--serve 时额外启动静态服务器(8765)。返回浏览器渲染步骤指引。',
    inputSchema: {
      type: 'object',
      properties: { serve: { type: 'boolean', description: '是否同时启动静态预览服务器 8765' } },
    },
  },
  {
    name: 'generate_hexmap',
    description: '根据地图描述生成 Hexfriend 六角格地图文件（.hexfriend，JSON 格式）。描述包含 title、orientation(flatTop/pointyTop)、shape(flower/square)、hexesOut、rows/columns、hexes 数组（每格含 col/row 或 q/r/s、terrain 地形key、label 地标名、detail 细节）。返回生成的文件路径。',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'object', description: '地图描述对象，字段：title, orientation, shape, hexesOut, rows, columns, hexes[]' },
        out_dir: { type: 'string', description: '输出目录，默认 Hexfriend/tools/output' },
      },
      required: ['description'],
    },
  },
  {
    name: 'list_terrain',
    description: '列出地图生成器支持的所有地形 key 及其显示名，用于 generate_hexmap 的 terrain 字段。',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
]

function callTool(name, args) {
  switch (name) {
    case 'map_inspect':
      return cli.inspect(args.map_file || cli.MAP_FILES[0])
    case 'map_layout':
      return cli.layout(args.map_file, {
        iconScale: args.icon_scale !== undefined ? args.icon_scale : 0.22,
        textDy: args.text_dy !== undefined ? args.text_dy : 16,
        textSize: args.text_size !== undefined ? args.text_size : 14,
        textStroke: args.text_stroke !== undefined ? args.text_stroke : 3,
      })
    case 'map_svg_convert':
      return (async () => {
        const done = await cli.svgConvert(args.keys && args.keys.length ? args.keys : undefined)
        return `已转换: ${done.join(', ')} -> /tmp/icons-png.json`
      })()
    case 'map_apply_icons': {
      const extra = {}
      for (const cellNo of Object.keys(args.cells || {})) {
        const v = String(args.cells[cellNo])
        const [key, display] = v.split(':')
        extra[cellNo] = { key, display: display || key }
      }
      return cli.applyIcons(args.map_file, extra)
    }
    case 'map_sync':
      return cli.sync(args.from)
    case 'map_preview_setup':
      cli.previewSetup(args.serve)
      return '预览接收服务器已启动(8900)。渲染步骤：浏览器打开 http://localhost:5173/?map=秋烬河谷.hexfriend 后执行 ' +
        'const a=globalThis.__PIXI_APP__; a.renderer.render(a.stage); window.__png=a.renderer.view.toDataURL("image/png"); ' +
        'fetch("http://localhost:8900/save",{method:"POST",body:window.__png})；然后查看 http://localhost:8765/map-preview.png'
    case 'generate_hexmap':
      return (async () => {
        const desc = args.description
        if (!desc || !Array.isArray(desc.hexes) || desc.hexes.length === 0) throw new Error('description 缺少 hexes 数组或为空')
        const core = await import('./hexmap-core.mjs')
        const saveData = core.generateSaveData(desc)
        const outDir = args.out_dir || path.join(__dirname, 'output')
        fs.mkdirSync(outDir, { recursive: true })
        const defaultName = (desc.title || 'map').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
        const filePath = path.join(outDir, `${defaultName}.hexfriend`)
        fs.writeFileSync(filePath, JSON.stringify(saveData, null, 2))
        return `地图已生成：${filePath}\n格子数：${Object.keys(saveData.TerrainField.hexes).length}\n文本标注：${saveData.texts.length}`
      })()
    case 'list_terrain':
      return (async () => {
        const core = await import('./hexmap-core.mjs')
        return '可用地形：' + Object.entries(core.DEFAULT_TERRAIN).map(([k, d]) => `${k}（${d.display}）`).join('、')
      })()
    default:
      throw new Error('未知工具: ' + name)
  }
}

// ---- stdio JSON-RPC 循环 ----
const rl = readline.createInterface({ input: process.stdin, terminal: false })

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

rl.on('line', async (line) => {
  let req
  try {
    req = JSON.parse(line)
  } catch {
    return
  }
  // 通知类（无 id）忽略
  if (req.id === undefined || req.id === null) return

  try {
    switch (req.method) {
      case 'initialize':
        send({ jsonrpc: '2.0', id: req.id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO } })
        break
      case 'tools/list':
        send({ jsonrpc: '2.0', id: req.id, result: { tools } })
        break
      case 'tools/call': {
        const { name, arguments: args } = req.params || {}
        const text = await callTool(name, args || {})
        send({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: String(text) }] } })
        break
      }
      case 'ping':
        send({ jsonrpc: '2.0', id: req.id, result: {} })
        break
      default:
        send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: '未知方法: ' + req.method } })
    }
  } catch (e) {
    send({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: String(e && e.message || e) } })
  }
})
