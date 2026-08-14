#!/usr/bin/env node
// Hexfriend 地图生成器 CLI
// 用法：
//   node cli.mjs <描述.json> [-o 输出.hexfriend]
//   cat 描述.json | node cli.mjs - -o 输出.hexfriend
//   node cli.mjs --list-terrain         列出所有地形 key
//   node cli.mjs --example              输出示例描述 JSON
import { readFileSync, writeFileSync } from 'node:fs'
import { generateSaveData, DEFAULT_TERRAIN } from './hexmap-core.mjs'

function printHelp() {
  console.log(`用法:
  node cli.mjs <描述.json> [-o 输出.hexfriend]
  cat 描述.json | node cli.mjs - -o 输出.hexfriend
  node cli.mjs --list-terrain
  node cli.mjs --example`)
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp()
    return
  }

  if (args.includes('--list-terrain')) {
    console.log('可用地形 key：')
    for (const [key, def] of Object.entries(DEFAULT_TERRAIN)) {
      console.log(`  ${key}  ${def.display}`)
    }
    return
  }

  if (args.includes('--example')) {
    console.log(JSON.stringify(
      {
        title: '示例地图',
        orientation: 'flatTop',
        shape: 'square',
        rows: 5,
        columns: 5,
        hexes: [
          { col: 0, row: 0, terrain: 'grassland', label: '花田', detail: '一片菊花田' },
          { col: 2, row: 2, terrain: 'settlement', label: '柳树渡', detail: '中心定居点' },
          { col: 4, row: 4, terrain: 'forest', label: '林间空地' },
        ],
      },
      null,
      2,
    ))
    return
  }

  // 解析 -o 输出路径
  let inputPath = null
  let outputPath = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o') {
      outputPath = args[i + 1]
      i++
    } else if (!inputPath) {
      inputPath = args[i]
    }
  }

  if (!inputPath) {
    console.error('错误：缺少输入文件')
    printHelp()
    process.exit(1)
  }

  // 读取描述
  let descriptionRaw
  if (inputPath === '-') {
    descriptionRaw = readFileSync(0, 'utf-8')
  } else {
    descriptionRaw = readFileSync(inputPath, 'utf-8')
  }

  let description
  try {
    description = JSON.parse(descriptionRaw)
  } catch (e) {
    console.error(`错误：无法解析描述 JSON：${e.message}`)
    process.exit(1)
  }

  if (!Array.isArray(description.hexes) || description.hexes.length === 0) {
    console.error('错误：描述中缺少 hexes 数组或为空')
    process.exit(1)
  }

  // 生成
  const saveData = generateSaveData(description)

  // 输出
  const defaultName = (description.title || 'map').replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
  const finalPath = outputPath || `${defaultName}.hexfriend`

  writeFileSync(finalPath, JSON.stringify(saveData, null, 2))
  console.log(`已生成：${finalPath}`)
  console.log(`格子数：${Object.keys(saveData.TerrainField.hexes).length}`)
  console.log(`文本标注：${saveData.texts.length}`)
}

main()
