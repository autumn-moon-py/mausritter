<script lang="ts">
  import { LATEST_TILESET_FORMAT_VERSION, type Tile, type Tileset } from '../types/tilesets'
  import { DEFAULT_BLANK_HEX_COLOR } from '../types/defaults'
  import { get_icon_scale_for_hex } from '../helpers/imageSizing'
  import { type PreviewHexInfo } from '../types'
  import { generate_icon_preview } from '../helpers/iconFns'
  import { generate_tile_previews } from '../helpers/tileFns'
  import { load_tileset_textures } from '../lib/texture_loader'

  let preview_hex_info: PreviewHexInfo = {
    height: 50 * 6,
    width: 43.3 * 6,
    orientation: HexOrientation.FLATTOP,
    color: new PIXI.Color(DEFAULT_BLANK_HEX_COLOR).toHex(),
  }

  import { HexOrientation } from '../types/terrain'

  import ColorInputPixi from './ColorInputPixi.svelte'
  import CanvasHolder from './CanvasHolder.svelte'

  import { getHexPathRadius } from '../helpers/hexHelpers'

  import { download } from '../lib/download2'
  import * as PIXI from 'pixi.js'
  import { afterUpdate, tick } from 'svelte'
  import { convert_tileset_to_latest } from '../lib/tilesetConverter'
  import { ScaleMode } from '../helpers/imageSizing'
  import PreviewHexControls from './PreviewHexControls.svelte'
  import type { ByDimensionIcon, RelativeIcon } from '../types/icon'

  let app = new PIXI.Application({
    height: 300,
    width: 300,
    backgroundAlpha: 0,
  })

  export let appState

  let textures = {} // texture_id: texture

  let workingTileset: Tileset = {
    name: 'New Tileset',
    id: 'new-tileset',
    author: '',
    version: 1,
    tiles: [],
    format_version: LATEST_TILESET_FORMAT_VERSION,
    supported_orientations: 'both',
    collapsed: false,
  }

  let grph_hex = new PIXI.Graphics()
  let spr_hex_symbol = new PIXI.Sprite()
  spr_hex_symbol.anchor.set(0.5)

  app.stage.addChild(grph_hex, spr_hex_symbol)

  let selectedTile: Tile | null = null
  let previews: {
    [tileId: string]: {
      [HexOrientation.FLATTOP]: string
      [HexOrientation.POINTYTOP]: string
    }
  } = {}

  /** Keep local color copies so you can edit the text boxes */
  let local_tile_color: string = new PIXI.Color(DEFAULT_BLANK_HEX_COLOR).toHex()
  // $: {
  //   if (selectedTile) {
  //     try {
  //       let c = new PIXI.Color(local_tile_color).toNumber()
  //       selectedTile.bgColor = c
  //     } catch {}
  //   }
  // }

  let local_symbol_color: string = '#ffffff'
  // $: {
  //   if (selectedTile?.symbol) {
  //     try {
  //       let c = new PIXI.Color(local_symbol_color).toNumber()
  //       selectedTile.symbol.color = c
  //     } catch {}
  //   }
  // }

  let previewSprite = new PIXI.Sprite()
  previewSprite.anchor.set(0.5)
  let previewGraphics = new PIXI.Graphics()
  let previewContainer = new PIXI.Container()
  previewContainer.addChild(previewGraphics, previewSprite)

  function findID(baseId: string): string {
    baseId = IDify(baseId)

    let counter = 0
    let proposedId = `${baseId}${counter === 0 ? '' : counter}`

    while (workingTileset.tiles.find((tile: Tile) => tile.id === proposedId)) {
      counter++
      proposedId = `${baseId}${counter === 0 ? '' : counter}`
    }

    return proposedId
  }

  async function newTile() {
    let newTile: Tile = selectedTile
      ? structuredClone(selectedTile)
      : {
          tileset_id: '', // Will be filled in on export
          display: '新六角格',
          id: findID('新六角格'),
          symbol: null,
          bgColor: DEFAULT_BLANK_HEX_COLOR,
          preview_flatTop: '',
          preview_pointyTop: '',
        }

    newTile.id = findID(newTile.id)

    const p = await get_tile_previews(newTile)
    newTile.preview_pointyTop = p.pointyTop
    newTile.preview_flatTop = p.flatTop

    workingTileset.tiles = [...workingTileset.tiles, newTile]

    selectedTile = workingTileset.tiles[workingTileset.tiles.length - 1]
  }

  function duplicateTile(tile: Tile) {
    let newTile = structuredClone(tile)

    newTile.display = 'Copy of ' + tile.display
    newTile.id = findID(newTile.display)

    workingTileset.tiles = [...workingTileset.tiles, newTile]
    selectedTile = workingTileset.tiles[workingTileset.tiles.length - 1]
  }

  function removeTile(tile: Tile) {
    workingTileset.tiles = workingTileset.tiles.filter((t: Tile) => t.id != tile.id)
  }

  const get_tile_previews = async (tile: Tile) => {
    const previews = await generate_tile_previews(
      tile,
      preview_hex_info,
      previewSprite,
      previewGraphics,
      previewContainer,
      app,
      true,
    )
    return previews
  }

  function IDify(name: string): string {
    return name.toLowerCase().replaceAll(' ', '-')
  }

  let symbolFiles: FileList

  async function updateSymbolFile() {
    let r = new FileReader()
    r.readAsDataURL(symbolFiles[0])
    r.onload = async (eb) => {
      let new_texture = await PIXI.Assets.load(r.result as string)

      selectedTile.symbol = {
        color: selectedTile.symbol ? selectedTile.symbol.color : 0xffffff,
        id: '',
        texWidth: new_texture.width,
        texHeight: new_texture.height,
        base64: r.result as string,
        rotation: 0,
        preview: '',
        display: '图块符号',
        texId: '', // Will be set equal to tiles id
        scaleMode: ScaleMode.RELATIVE,
        pHex: 80,
      }
    }

    await get_tile_previews(selectedTile)
  }

  function exportTileset() {
    let export_tileset: Tileset = workingTileset as Tileset

    // Transformations into real tile and tileset data structures
    export_tileset.id = IDify(workingTileset.name)

    // Reset IDs, which will be found immediately after
    export_tileset.tiles.forEach((t) => {
      t.id = ''
    })

    export_tileset.tiles.forEach((tile) => {
      tile.id = findID(tile.display)
      tile.tileset_id = export_tileset.id
    })

    console.log("Tileset I'm exporting: ", export_tileset)
    download(JSON.stringify(export_tileset), `${export_tileset.id}.hfts`, 'application/json')
  }

  let importFiles: FileList

  async function importTileset() {
    let importFile = importFiles[0]

    if (!importFile) return

    let r = new FileReader()
    r.readAsText(importFile)
    r.onload = async (eb) => {
      /* Read the file */
      let setToImport = JSON.parse(eb.target.result as string)

      setToImport = await convert_tileset_to_latest(setToImport)

      console.log("Tileset I'm importing: ", setToImport)

      load_tileset_textures(setToImport)

      /* Load textures */

      workingTileset = { ...setToImport }
      selectedTile = null

      await tick()
      //workingTileset.tiles = workingTileset.tiles;
    }
  }

  // Dragging Code
  // Has a problem where the tile is deselected after dropping. What???
  let phantomTileButtonId

  function dragButton(e: DragEvent, tile: Tile) {
    //console.log(icon);

    phantomTileButtonId = tile.id

    e.dataTransfer.setData('text/json', JSON.stringify(tile))
  }

  function dropButton(e: DragEvent) {
    phantomTileButtonId = null
  }

  function draggedOverButton(e: DragEvent, tile: Tile) {
    if (tile.id == phantomTileButtonId) return

    let draggedOverIndex = workingTileset.tiles.indexOf(tile)
    const draggedTile = workingTileset.tiles.find((t) => t.id === phantomTileButtonId)
    workingTileset.tiles = workingTileset.tiles.filter((i) => i.id != phantomTileButtonId)

    // If phantom is on the left, switch them. Otherwise, proceed as normal
    if (draggedOverIndex != 0 && workingTileset.tiles[draggedOverIndex - 1].id == phantomTileButtonId) {
      workingTileset.tiles.splice(draggedOverIndex + 1, 0, draggedTile)
    } else {
      workingTileset.tiles.splice(draggedOverIndex, 0, draggedTile)
    }

    workingTileset = workingTileset
  }

  const update_symbol_scalemode = (new_mode: string) => {
    delete (selectedTile.symbol as RelativeIcon).pHex
    delete (selectedTile.symbol as ByDimensionIcon).pWidth
    delete (selectedTile.symbol as ByDimensionIcon).pHeight

    if (new_mode === ScaleMode.RELATIVE) {
      selectedTile.symbol.scaleMode = new_mode
      ;(selectedTile.symbol as RelativeIcon).pHex = 80
    } else {
      selectedTile.symbol.scaleMode = new_mode as ScaleMode
      ;(selectedTile.symbol as ByDimensionIcon).pWidth = 100
      ;(selectedTile.symbol as ByDimensionIcon).pHeight = 100
    }
  }

  afterUpdate(async () => {
    console.log('After Updating Tileset Creator')
    if (selectedTile) {
      //get_tile_previews(selectedTile)

      grph_hex.clear()
      grph_hex.beginFill(selectedTile.bgColor)
      grph_hex.drawPolygon(getHexPathRadius(150, preview_hex_info.orientation, 150, 150))
      grph_hex.endFill()

      let spr_symbol = spr_hex_symbol
      spr_symbol.visible = false

      if (selectedTile.symbol) {
        spr_symbol.visible = true
        let symbol_texture = await PIXI.Assets.load(selectedTile.symbol.base64)

        spr_symbol.texture = symbol_texture
        const symbol_scale = get_icon_scale_for_hex(selectedTile.symbol, preview_hex_info)
        const mtrx = new PIXI.Matrix()
          .rotate(PIXI.DEG_TO_RAD * selectedTile.symbol.rotation)
          .scale(symbol_scale.x, symbol_scale.y)
        spr_symbol.transform.setFromMatrix(mtrx)
        spr_symbol.x = 150
        spr_symbol.y = 150
        spr_symbol.tint = selectedTile.symbol.color
      }

      // Update preview of the selected tile
      const newpreviews = await get_tile_previews(selectedTile)
      if (selectedTile.preview_flatTop !== newpreviews.flatTop) {
        selectedTile.preview_flatTop = newpreviews.flatTop
        selectedTile.preview_pointyTop = newpreviews.pointyTop
        workingTileset = workingTileset
      }
    }
  })
</script>

<main>
  <nav>
    <div id="set-controls">
      <div id="tileset-attr-grid">
        <button
          on:click={() => {
            appState = 'normal'
          }}
          style="grid-column: 1/3;"
        >
          {'退出图块集编辑器'}
        </button>

        <label for="setName">{'图块集名称'}</label>
        <input id="setName" type="text" bind:value={workingTileset.name} placeholder="Tileset Name" />

        <label for="setAuthor">{'作者'}</label>
        <input id="setAuthor" type="text" bind:value={workingTileset.author} placeholder="You!" />

        <label for="tileset-supports">{'支持'}</label>
        <select id="tileset-supports" bind:value={workingTileset.supported_orientations}>
          <option value={HexOrientation.FLATTOP}
            >平顶</option
          >
          <option value={HexOrientation.POINTYTOP}
            >尖顶</option
          >
          <option value={'both'}>两者</option>
        </select>

        <label for="setVersion">{'版本'}</label>
        <input id="setVersion" type="number" bind:value={workingTileset.version} />

        <button on:click={() => importTileset()} class="file-input-button">
          {'导入图块集'}
          <input
            type="file"
            bind:files={importFiles}
            accept={'.hfts'}
            on:change={(e) => {
              importTileset()
              e.currentTarget.value = ''
            }}
          />
        </button>

        <button on:click={() => exportTileset()}>{'导出图块集'}</button>
      </div>
    </div>

    <div id="tile-buttons-ctr">
      <div
        id="tile-buttons"
        on:dragover={(e) => {
          e.preventDefault()
        }}
        on:dragenter={(e) => {
          e.preventDefault()
        }}
        on:drop={dropButton}
      >
        {#each workingTileset.tiles as tile (tile.id)}
          <button
            class="tile-button"
            class:selected={selectedTile == tile}
            style={tile.id == phantomTileButtonId ? 'opacity: 0' : ''}
            on:click={() => {
              selectedTile = tile
              local_tile_color = new PIXI.Color(tile.bgColor).toHex()
              if (tile.symbol) local_symbol_color = new PIXI.Color(tile.symbol.color).toHex()
            }}
            draggable={true}
            on:dragstart={(e) => {
              dragButton(e, tile)
            }}
            on:dragenter={(e) => {
              draggedOverButton(e, tile)
            }}
            title={tile.display}
          >
            <img src={tile[`preview_${preview_hex_info.orientation}`]} draggable="false" alt={tile.display} />
          </button>
        {/each}

        <button
          class="tile-button"
          on:click={() => {
            newTile()
          }}>+</button
        >
      </div>
    </div>
  </nav>

  {#if selectedTile}
    <section id="tile-preview">
      <div id="pixi-container" style="height: 300px; width: 300px;">
        <CanvasHolder {app} />
      </div>

      <input
        type="text"
        bind:value={selectedTile.display}
        on:change={() => {
          workingTileset.tiles = workingTileset.tiles
        }}
      />

      <div id="tile-preview-controls">
        <button
          class="outline-button"
          on:click={() => {
            preview_hex_info.orientation =
              preview_hex_info.orientation == HexOrientation.FLATTOP ? HexOrientation.POINTYTOP : HexOrientation.FLATTOP
          }}
          title={'更改六角格朝向'}
        >
          <img src="/assets/img/tools/changeOrientation.png" alt="修改朝向" />
        </button>
        <button
          class="outline-button"
          on:click={() => {
            duplicateTile(selectedTile)
          }}
          title={'复制这个六角格'}
        >
          <img src="/assets/img/tools/duplicate.png" alt="复制六角格" />
        </button>
        <button
          class="outline-button"
          on:click={() => {
            removeTile(selectedTile)
            selectedTile = null
          }}
          title={'删除这个六角格'}
        >
          <img src="/assets/img/tools/trash.png" alt="Trash" />
        </button>
      </div>

      <details style="width: 80%; margin-top: 5px;">
        <summary>Preview Hex Controls</summary>
        <div id="creator-hex-controls">
          <PreviewHexControls bind:preview_hex_info />
        </div>
      </details>
    </section>

    <aside id="tile-style">
      <!-- Background Color -->
      <div class="color" style="margin-bottom: 0.5em">
        <ColorInputPixi
          bind:value={selectedTile.bgColor}
          on:input={(e) => {
            local_tile_color = e.detail.string
          }}
          w={'50'}
          h={'50'}
        />

        <div>
          <label for="bg-input">Background</label>
          <input
            style="border-radius: var(--small-radius)"
            type="string"
            class="color-string"
            bind:value={local_tile_color}
            on:input={(e) => {
              try {
                const new_color = new PIXI.Color(e.currentTarget.value).toNumber()
                selectedTile.bgColor = new_color
              } catch {}
            }}
          />
        </div>
      </div>

      <!-- Upload Symbol Button -->
      <button class="file-input-button outline-button" style="margin-bottom: 0.25em">
        {selectedTile.symbol ? '替换符号' : '上传符号'}
        <input
          type="file"
          accept="image/*"
          bind:files={symbolFiles}
          on:change={(e) => {
            updateSymbolFile()
            e.currentTarget.value = '' /*Hacky, but necessary*/
          }}
        />
      </button>

      <!-- Remove Symbol Button -->
      {#if selectedTile.symbol}
        <button
          class="outline-button"
          on:click={() => {
            selectedTile.symbol = null
          }}
        >
          {'移除符号'}
        </button>
      {/if}

      <!-- Symbol Input Controls -->
      {#if selectedTile.symbol}
        <!-- Symbol Color -->
        <div class="color" style="margin-top: 10px">
          <ColorInputPixi
            bind:value={selectedTile.symbol.color}
            on:input={(e) => (local_symbol_color = e.detail.string)}
            w={'50'}
            h={'50'}
          />

          <div>
            <label for="symbol-color">{'符号'}</label>
            <input
              id="symbol-color"
              bind:value={local_symbol_color}
              on:input={(e) => {
                try {
                  const new_color = new PIXI.Color(e.currentTarget.value).toNumber()
                  selectedTile.symbol.color = new_color
                } catch {}
              }}
            />
          </div>
        </div>

        <!-- Symbol Rotation -->
        <div class="builder-control-row">
          <label for="tile-scale-relative">{'旋转'}</label>
          <input id="tile-scale-relative" type="number" bind:value={selectedTile.symbol.rotation} />
          deg
        </div>
        <div class="builder-control-row" style="margin-bottom: 0.5em;">
          <button
            style="height: 2em;"
            class="img-button"
            on:click={() => (selectedTile.symbol.rotation = (360 + selectedTile.symbol.rotation - 60) % 360)}
          >
            <img
              src={`/assets/img/ui/rotate60_left_${preview_hex_info.orientation}.png`}
              alt={'左转60度'}
            />
          </button>
          <input type="range" min="0" max="359" bind:value={selectedTile.symbol.rotation} />
          <button
            style="height: 2em;"
            class="img-button"
            on:click={() => (selectedTile.symbol.rotation = (selectedTile.symbol.rotation + 60) % 360)}
          >
            <img
              src={`/assets/img/ui/rotate60_right_${preview_hex_info.orientation}.png`}
              alt={'右转60度'}
            />
          </button>
        </div>

        <!-- Symbol Scale -->
        <div class="builder-control-row">
          <label for="tile-scalemode">{'符号缩放'}</label>
          <select
            id="tile-scalemode"
            value={selectedTile.symbol.scaleMode}
            on:input={(e) => update_symbol_scalemode(e.currentTarget.value)}
          >
            <option value={ScaleMode.RELATIVE}>相对比例</option>
            <option value={ScaleMode.BYDIMENSION}>按尺寸</option>
          </select>
        </div>
        {#if selectedTile.symbol.scaleMode === ScaleMode.RELATIVE}
          <div class="builder-control-row">
            <label for="tile-scale-relative">{'占六角格比例'}</label>
            <input id="tile-scale-relative" type="number" bind:value={selectedTile.symbol.pHex} />
            %
          </div>
          <div class="builder-control-row">
            <input type="range" min="5" max="100" bind:value={selectedTile.symbol.pHex} />
          </div>
        {:else if selectedTile.symbol.scaleMode === ScaleMode.BYDIMENSION}
          <div class="builder-control-row">
            <label for="tile-scale-relative">{'宽度的百分比'}</label>
            <input id="tile-scale-relative" type="number" bind:value={selectedTile.symbol.pWidth} />
            %
          </div>
          <div class="builder-control-row">
            <input type="range" min="5" max="100" bind:value={selectedTile.symbol.pWidth} />
          </div>

          <div class="builder-control-row">
            <label for="tile-scale-relative">{'高度的百分比'}</label>
            <input id="tile-scale-relative" type="number" bind:value={selectedTile.symbol.pHeight} />
            %
          </div>
          <div class="builder-control-row">
            <input type="range" min="5" max="100" bind:value={selectedTile.symbol.pHeight} />
          </div>
        {/if}
      {/if}
    </aside>
  {:else}
    <aside id="editor-placeholder">
      <p style="color: #f2f2f2; margin-bottom: 10px;">
        {'选择一个图块或新建一个！'}
      </p>

      <p style="font-size: 10pt">
        {'为获得最佳效果，请使用 100x100 像素的白色图像作为符号。'}
      </p>
    </aside>
  {/if}
</main>

<style>
  #tile-preview-controls {
    margin-top: 5px;
    display: flex;
    gap: 5px;
  }

  #tile-preview-controls button {
    width: 40px;
    height: 40px;
    padding: 0px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #tile-preview-controls button img {
    height: 80%;
  }

  #set-controls {
    padding: 10px;
    background-color: #555555;
    box-sizing: border-box;
  }

  #set-controls #tileset-attr-grid {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    gap: 5px;
  }

  #tileset-attr-grid input {
    width: 100%;
    box-sizing: border-box;
    height: 2em;
  }

  #tileset-attr-grid label {
    height: 100%;
    display: flex;
    align-items: center;
  }

  #creator-hex-controls {
    padding: 0.5em;
    display: grid;
    grid-template-columns: 3fr 1fr;
    grid-auto-rows: 1fr;
    grid-row-gap: 0.25em;
  }

  #editor-placeholder {
    grid-column: 2/4;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  #editor-placeholder p {
    color: #aaaaaa;
    margin: 0;
  }

  .file-input-button {
    position: relative;
  }

  .file-input-button input {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0px;
    left: 0px;
    opacity: 0;
  }

  main {
    display: grid;
    grid-template-columns: 310px 1fr 1fr;
    grid-template-rows: 1fr;
    margin: 0;
    height: 100%;
    color: #f2f2f2;
  }

  #editor-placeholder {
    grid-column: 2/4;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #tile-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  #tile-style {
    display: flex;
    justify-content: center;
    flex-direction: column;
    min-width: 350px;
    width: 50%;
  }

  nav {
    height: 100vh;
    background-color: #222222;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  #tile-buttons-ctr {
    overflow-y: auto;
  }

  #tile-buttons {
    padding: 10px;
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(5, 50px);
    grid-template-rows: 50px;
    grid-auto-rows: 50px;
  }

  .tile-button {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tile-button img {
    max-width: 100%;
    max-height: 100%;
  }

  .color {
    display: grid;
    grid-template-columns: 60px 1fr;
    grid-template-rows: 60px;
    column-gap: 10px;
  }

  .color div {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .color p {
    margin: 0;
  }

  .color .color-string {
    font-size: 10pt;
    color: #bbbbbb;
  }

  .builder-control-row {
    display: flex;
    gap: 0.25em;
    height: 2em;
    align-items: center;
  }
  .builder-control-row :first-child {
    flex-grow: 1;
  }

  .builder-control-row input[type='number'] {
    width: 4em;
    height: 2em;
  }
</style>
