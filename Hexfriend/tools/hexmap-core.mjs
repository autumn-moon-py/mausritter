// Hexfriend 地图生成器核心
// 输入：地图描述对象 → 输出：Hexfriend SaveData v14（.hexfriend 文件内容）
// 纯 JS 无依赖，可在 Node 与 MCP server 中复用

import { deflateSync } from 'node:zlib'

// ---------- 纯色 PNG 生成（用于 tile 预览图，Hexfriend 地形面板需要有效图片） ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function makeSolidPngBase64(hexColor) {
  const size = 32
  const r = (hexColor >> 16) & 0xff
  const g = (hexColor >> 8) & 0xff
  const b = hexColor & 0xff

  // 扫描线：每行前加 filter 字节 0，然后 RGB 像素
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 3
      raw[px] = r
      raw[px + 1] = g
      raw[px + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0) // width
  ihdr.writeUInt32BE(size, 4) // height
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])

  return `data:image/png;base64,${png.toString('base64')}`
}

// ---------- 坐标换算（与 Hexfriend src/helpers/hexHelpers.ts 一致） ----------

function coords_evenqToCube(col, row) {
  const q = col
  const r = row - (col + (col & 1)) / 2
  return { q, r, s: -q - r }
}

function coords_oddqToCube(col, row) {
  const q = col
  const r = row - (col - (col & 1)) / 2
  return { q, r, s: -q - r }
}

export function coords_qToCube(raisedColumn, col, row) {
  if (raisedColumn === 'even') return coords_evenqToCube(col, row)
  return coords_oddqToCube(col, row)
}

function cubeToWorldFlatTop(q, r, s, hexWidth, hexHeight, gap = 0) {
  const hw = hexWidth + gap
  const hh = hexHeight + gap
  const x = q * hw * 0.75
  const y = (r * hh) / 2 - (s * hh) / 2
  return { x, y }
}

function cubeToWorldPointyTop(q, r, s, hexWidth, hexHeight, gap = 0) {
  const hw = hexWidth + gap
  const hh = hexHeight + gap
  const x = (q * hw) / 2 - (s * hw) / 2
  const y = r * hh * 0.75
  return { x, y }
}

export function coords_cubeToWorld(q, r, s, orientation, hexWidth, hexHeight, gap = 0) {
  if (orientation === 'pointyTop') return cubeToWorldPointyTop(q, r, s, hexWidth, hexHeight, gap)
  return cubeToWorldFlatTop(q, r, s, hexWidth, hexHeight, gap)
}

// ---------- 地形映射（默认配色，可按需覆盖） ----------

export const DEFAULT_TERRAIN = {
  grassland: { display: '草地', bgColor: 0xa8c66c },
  plains: { display: '平原', bgColor: 0xc8d98a },
  farmland: { display: '农田', bgColor: 0xd9c46a },
  forest: { display: '森林', bgColor: 0x4f7a3d },
  pines: { display: '针叶林', bgColor: 0x3f6a52 },
  jungle: { display: '丛林', bgColor: 0x2e6b3e },
  water: { display: '水域', bgColor: 0x4a90d9 },
  river: { display: '河流', bgColor: 0x6fb1e0 },
  marsh: { display: '沼泽', bgColor: 0x6a8a6a },
  mountains: { display: '山脉', bgColor: 0x8a7f6a },
  hills: { display: '丘陵', bgColor: 0xa8a06a },
  desert: { display: '沙漠', bgColor: 0xe0d8a0 },
  tundra: { display: '冻土', bgColor: 0xd8e0e0 },
  ice: { display: '冰原', bgColor: 0xcfe8f0 },
  settlement: { display: '定居点', bgColor: 0xd8a060 },
  village: { display: '村庄', bgColor: 0xc89050 },
  town: { display: '城镇', bgColor: 0xb87848 },
  city: { display: '城市', bgColor: 0xa86848 },
  ruin: { display: '废墟', bgColor: 0x9a8a7a },
  graveyard: { display: '墓地', bgColor: 0x7a7a8a },
  cave: { display: '洞穴', bgColor: 0x6a6a6a },
}

// ---------- 文本样式 ----------

const REGION_STYLE = {
  fontFamily: 'Times New Roman',
  fill: 0xffffff,
  fontSize: 32,
  strokeThickness: 6,
  stroke: 0x000000,
  align: 'left',
  fontStyle: 'normal',
  fontWeight: 'normal',
  alpha: 1,
}

const LABEL_STYLE = {
  fontFamily: 'Segoe UI',
  fill: 0xffffff,
  fontSize: 20,
  strokeThickness: 4,
  stroke: 0x000000,
  align: 'center',
  fontStyle: 'normal',
  fontWeight: 'bold',
  alpha: 1,
}

const DETAIL_STYLE = {
  fontFamily: 'Segoe UI',
  fill: 0xffffff,
  fontSize: 14,
  strokeThickness: 3,
  stroke: 0x000000,
  align: 'center',
  fontStyle: 'normal',
  fontWeight: 'normal',
  alpha: 0.85,
}

// 最小占位图标集：Hexfriend 加载时强制读取 iconsets[0].icons[0]，空数组会崩溃
const PLACEHOLDER_ICONSET = {
  name: '占位图标',
  supported_orientations: 'both',
  id: 'campaign_placeholder',
  author: 'Mausritter Campaign Generator',
  version: 1,
  collapsed: false,
  icons: [
    {
      display: 'Dot',
      texId: 'campaign_placeholder_dot',
      id: 'campaign_placeholder_dot',
      color: 0,
      pHex: 10,
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      texWidth: 100,
      texHeight: 100,
      scaleMode: 'relative',
      rotation: 0,
    },
  ],
  format_version: 2,
}

// ---------- 地图生成 ----------

// description 结构：
// {
//   title: string
//   orientation?: 'flatTop' | 'pointyTop'     默认 flatTop
//   shape?: 'flower' | 'square'               默认 square
//   hexesOut?: number                         flower 半径（默认 7）
//   rows?: number                             square 行数（默认 5）
//   columns?: number                          square 列数（默认 5）
//   raisedColumn?: 'even' | 'odd'             默认 even
//   hexWidth?: number                         默认 50
//   hexHeight?: number                        默认 43.3
//   terrain?: { [key: string]: { display, bgColor } }  地形定义覆盖
//   hexes: [
//     {
//       col, row,             // square 模式下用 col/row（0 起始）
//       q, r, s,              // 或直接提供 cube 坐标
//       terrain: 'forest',    // 地形 key（DEFAULT_TERRAIN 或自定义）
//       label?: string,       // 地标名（居中大字）
//       detail?: string,      // 细节描述（小字）
//       text_x?: number,      // 可选文本偏移
//       text_y?: number,
//     }
//   ]
// }

export function generateSaveData(description) {
  const title = description.title || 'Untitled Map'
  const orientation = description.orientation || 'flatTop'
  const shape = description.shape || 'square'
  const hexesOut = description.hexesOut ?? 7
  const rows = description.rows ?? 5
  const columns = description.columns ?? 5
  const raisedColumn = description.raisedColumn || 'even'
  const hexWidth = description.hexWidth ?? 50
  const hexHeight = description.hexHeight ?? 43.3

  // 合并地形定义
  const terrainDefs = { ...DEFAULT_TERRAIN, ...(description.terrain || {}) }

  // 收集用到的地形
  const usedTerrain = new Set()
  const hexes = {}

  // 生成所有 hex 的 cube 坐标
  const coords = []
  if (shape === 'flower') {
    for (let q = -hexesOut; q <= hexesOut; q++) {
      for (let r = -hexesOut; r <= hexesOut; r++) {
        if (q + r <= hexesOut && q + r >= -hexesOut) {
          const s = -q - r
          coords.push({ q, r, s })
        }
      }
    }
  } else {
    for (let col = 0; col < columns; col++) {
      for (let row = 0; row < rows; row++) {
        const c = coords_qToCube(raisedColumn, col, row)
        coords.push({ col, row, ...c })
      }
    }
  }

  // 用户显式指定的 hex（按 q:r:s 索引）
  const explicitHexes = {}
  for (const h of description.hexes || []) {
    let c
    if (h.q !== undefined && h.r !== undefined) {
      c = { q: h.q, r: h.r, s: h.q !== undefined && h.s !== undefined ? h.s : -h.q - h.r }
    } else if (h.col !== undefined && h.row !== undefined) {
      c = { col: h.col, row: h.row, ...coords_qToCube(raisedColumn, h.col, h.row) }
    } else {
      continue
    }
    explicitHexes[`${c.q}:${c.r}:${c.s}`] = h
  }

  // 填充 hexes
  for (const c of coords) {
    const key = `${c.q}:${c.r}:${c.s}`
    const explicit = explicitHexes[key]
    const terrain = explicit?.terrain

    let tile = null
    if (terrain && terrainDefs[terrain]) {
      usedTerrain.add(terrain)
      const def = terrainDefs[terrain]
      const preview = makeSolidPngBase64(def.bgColor)
      tile = {
        display: def.display,
        bgColor: def.bgColor,
        id: terrain,
        symbol: null,
        tileset_id: 'campaign',
        preview_flatTop: preview,
        preview_pointyTop: preview,
      }
    }

    hexes[key] = { q: c.q, r: c.r, s: c.s, tile }
  }

  // 文本标注
  // numberOnly: 只显示每格编号（与战役文档六角格编号对应），不显示地标名/细节，
  // 避免文字覆盖地图内容。编号按 hexes 数组顺序 1..n，也可用每格的 number 字段指定。
  const numberOnly = description.numberOnly === true
  const texts = []
  const text_styles = [
    { display: 'Region', style: { ...REGION_STYLE }, id: 0 },
    { display: 'Label', style: { ...LABEL_STYLE }, id: 1 },
    { display: 'Detail', style: { ...DETAIL_STYLE }, id: 2 },
  ]

  let textId = 0
  ;(description.hexes || []).forEach((h, idx) => {
    let c
    if (h.q !== undefined && h.r !== undefined) {
      c = { q: h.q, r: h.r, s: h.s !== undefined ? h.s : -h.q - h.r }
    } else if (h.col !== undefined && h.row !== undefined) {
      c = { ...coords_qToCube(raisedColumn, h.col, h.row) }
    } else {
      return
    }

    const center = coords_cubeToWorld(c.q, c.r, c.s, orientation, hexWidth, hexHeight)

    if (numberOnly) {
      const num = h.number ?? idx + 1
      texts.push({
        id: textId++,
        text: String(num),
        // 编号保持清晰但不超出格子（50px 宽格子，字号 22 + 细描边）
        style: {
          fontFamily: 'Arial Black',
          fill: 0xffffff,
          fontSize: 22,
          strokeThickness: 4,
          stroke: 0x000000,
          // 'centered'：格子内完全居中（ALIGN_MAP 中的 x/y 均 0.5），
          // 避免文本以格子中心为左上角向下延伸、底部超出格子
          align: 'centered',
          fontStyle: 'normal',
          fontWeight: 'bold',
          alpha: 1,
        },
        x: center.x + (h.text_x ?? 0),
        y: center.y + (h.text_y ?? 0),
        rotation: 0,
      })
      return
    }

    if (h.label) {
      texts.push({
        id: textId++,
        text: h.label,
        style: { ...LABEL_STYLE },
        x: center.x + (h.text_x ?? 0),
        y: center.y + (h.text_y ?? (h.detail ? -6 : 0)),
        rotation: 0,
      })
    }

    if (h.detail) {
      texts.push({
        id: textId++,
        text: h.detail,
        style: { ...DETAIL_STYLE },
        x: center.x + (h.text_x ?? 0),
        y: center.y + (h.label ? 14 : 0) + (h.text_y ?? 0),
        rotation: 0,
      })
    }
  })

  // tileset
  const tiles = []
  let tileId = 0
  for (const terrain of usedTerrain) {
    const def = terrainDefs[terrain]
    const preview = makeSolidPngBase64(def.bgColor)
    tiles.push({
      display: def.display,
      bgColor: def.bgColor,
      id: terrain,
      symbol: null,
      tileset_id: 'campaign',
      preview_flatTop: preview,
      preview_pointyTop: preview,
      index: tileId++,
    })
  }

  const tileset = {
    name: '战役地图',
    id: 'campaign',
    author: 'Mausritter Campaign Generator',
    version: 1,
    collapsed: false,
    tiles,
    format_version: 4,
    supported_orientations: 'both',
  }

  const saveData = {
    saveVersion: 14,
    title,

    TerrainField: {
      hexWidth,
      hexHeight,
      orientation,
      gap: 0,

      rows,
      columns,
      raised: raisedColumn === 'even' ? 'even' : 'odd',

      hexesOut,
      mapShape: shape === 'flower' ? 'flower' : 'square',

      blankHexColor: 0xf2f2f2,

      grid: { stroke: 0x333333, thickness: 1, shown: true },

      largehexes: {
        shown: false,
        style: { width: 3, color: 0x333333 },
        offset: { x: 0, y: 1 },
        diameterInHexes: 3,
        raised: 'even',
        encompassEdges: false,
      },

      hexes,
    },

    icon_hex_size_percentage: 80,

    coords: {
      shown: false,
      style: { fill: 0x000000, fontSize: 10, stroke: 0xffffff, strokeThickness: 2, fontFamily: 'Segoe UI' },
      system: 1,
      seperator: '.',
      gap: 4,
      offsets: {
        row_col: { row: 0, col: 0 },
        cube: { q: 0, r: 0, s: 0 },
      },
    },

    tilesets: [tileset],
    iconsets: [PLACEHOLDER_ICONSET],

    overlay: {
      shown: true,
      x: 0,
      y: 0,
      scale: { x: 1, y: 1 },
      opacity: 0.5,
    },

    overlay_base64: null,

    paths: [],
    icons: [],
    texts,

    path_styles: [
      {
        display: 'River',
        style: {
          color: 10742015,
          width: 6,
          cap: 'round',
          join: 'round',
          dashed: false,
          dash_length: 10,
          dash_gap: 5,
          filled: false,
          fill_color: 10742015,
          fill_opacity: 0.5,
        },
        id: 1,
      },
      {
        display: 'Path',
        style: {
          color: 16774327,
          width: 4,
          cap: 'round',
          join: 'round',
          dashed: false,
          dash_length: 10,
          dash_gap: 5,
          filled: false,
          fill_color: 16774327,
          fill_opacity: 0.5,
        },
        id: 2,
      },
    ],

    text_styles,
  }

  return saveData
}

// 从描述对象生成 .hexfriend 文件内容（JSON 字符串）
export function generateHexfriendContent(description) {
  const saveData = generateSaveData(description)
  return JSON.stringify(saveData, null, 2)
}
