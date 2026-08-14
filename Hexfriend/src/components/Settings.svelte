<script lang="ts">
  // Types
  import type CoordsLayer from '../layers/CoordsLayer.svelte'
  import type IconLayer from '../layers/IconLayer.svelte'
  import type PathLayer from '../layers/PathLayer.svelte'
  import type TerrainLayer from '../layers/TerrainLayer.svelte'
  import type TextLayer from '../layers/TextLayer.svelte'
  import type OverlayLayer from '../layers/OverlayLayer.svelte'
  import type TerrainPanel from '../panels/TerrainPanel.svelte'
  import type IconPanel from '../panels/IconPanel.svelte'
  import type { Iconset } from '../types/icon'
  import type { SaveData } from '../types/savedata'
  import type { Tileset } from '../types/tilesets'
  import { Map_Exports } from '../types/export'

  // Styles
  import '../styles/settings.css'

  // Stores
  import { tfield } from '../stores/tfield'
  import { resize_parameters } from '../stores/resize_parameters'

  // Components
  import GridSettings from './settings/GridSettings.svelte'
  import SettingHeading from './settings/SettingHeading.svelte'
  import HexesSettings from './settings/HexesSettings.svelte'
  import DimensionSettings from './settings/DimensionSettings.svelte'
  import CoordinateSettings from './settings/CoordinateSettings.svelte'
  import OverlaySettings from './settings/OverlaySettings.svelte'
  import TilesetSettings from './settings/TilesetSettings.svelte'
  import IconsetSettings from './settings/IconsetSettings.svelte'
  import GeneratorSettings from './settings/GeneratorSettings.svelte'

  // Lib
  import { onMount } from 'svelte'
  import SelectGrid from './SelectGrid.svelte'
  import type { HexSizeParams } from '../lib/map_resize'
  import { map_shape } from '../types/settings'
  import SavedMaps from './SavedMaps.svelte'
  import { startUndoState, completeUndoState } from '../lib/undoManager'
  import { rand } from '../helpers'

  export let loadedSave: SaveData
  export let showSettings: boolean
  export let appState
  export let showTerrainGenerator: boolean
  export let show_icon_generator: boolean

  export let exportMap: Function

  let hidden_settings = {
    grid: true,
    hexes: true,
    dimensions: true,
    coordinates: true,
    overlay: true,
    tilesets: true,
    iconsets: true,
    experimental: true,
  }

  export let renderAllHexes: Function
  export let renderGrid: Function
  export let redrawEntireMap: Function

  //export let data_terrain: terrain_data

  export let comp_terrainLayer: TerrainLayer
  export let comp_iconLayer: IconLayer
  export let comp_pathLayer: PathLayer
  export let comp_textLayer: TextLayer
  export let comp_coordsLayer: CoordsLayer
  export let comp_overlayLayer: OverlayLayer

  export let comp_terrain_panel: TerrainPanel
  export let comp_icon_panel: IconPanel

  export let load: Function

  let retainIconPosition: boolean = true
  let retainPathPosition: boolean = true
  let retainTextPosition: boolean = true
  let retain_icon_scale: boolean = true

  let exportType: 'Export As...' | 'image/png' | 'application/json' = 'Export As...'

  // [[ let iconset_text = 'Icon Set' ]] - Encased in the museum, a historical artifact of Hexfriends whimsy

  function retain_positions_on_resize() {
    const old_hex_size: HexSizeParams = {
      width: $resize_parameters.old_hex_width,
      height: $resize_parameters.old_hex_height,
      orientation: $resize_parameters.old_orientation,
      gap: $resize_parameters.old_gap,
    }
    const new_hex_size: HexSizeParams = {
      width: $tfield.hexWidth,
      height: $tfield.hexHeight,
      orientation: $tfield.orientation,
      gap: $tfield.gap,
    }

    if (retainIconPosition) comp_iconLayer.retain_icon_position_on_hex_resize(old_hex_size, new_hex_size)
    if (retainPathPosition) comp_pathLayer.retain_path_position_on_hex_resize(old_hex_size, new_hex_size)
    if (retainTextPosition) comp_textLayer.retain_text_position_on_hex_resize(old_hex_size, new_hex_size)
  }

  /* Maintains the relative X and Y position to the hex for icons, text and paths
   * Note that this keeps icons in the same hex coordinates, which for flower maps means they rotate around with the map
   */
  const retain_positions_on_orientation_change = () => {
    if ($tfield.mapShape === map_shape.FLOWER) {
      retain_positions_on_resize() // Equiv. because Orientation is tracked in resize params
    } else {
      const old_hex_size: HexSizeParams = {
        width: $resize_parameters.old_hex_width,
        height: $resize_parameters.old_hex_height,
        orientation: $resize_parameters.old_orientation,
        gap: $resize_parameters.old_gap,
      }
      const new_hex_size: HexSizeParams = {
        width: $tfield.hexWidth,
        height: $tfield.hexHeight,
        orientation: $tfield.orientation,
        gap: $tfield.gap,
      }

      if (retainIconPosition)
        comp_iconLayer.retain_icon_position_on_orientation_change(old_hex_size, new_hex_size, $tfield.raised)
      if (retainPathPosition)
        comp_pathLayer.retain_path_position_on_orientation_change(old_hex_size, new_hex_size, $tfield.raised)
      if (retainTextPosition)
        comp_textLayer.retain_text_position_on_orientation_change(old_hex_size, new_hex_size, $tfield.raised)
    }
  }

  /** Retains scale of icons on hex changes */
  const retain_scale = () => {
    const new_hex_size: HexSizeParams = {
      width: $tfield.hexWidth,
      height: $tfield.hexHeight,
      orientation: $tfield.orientation,
      gap: $tfield.gap,
    }
    if (retain_icon_scale) comp_iconLayer.retain_icon_scale(new_hex_size)
  }

  /* Takes the current attribs from terrain field and keeps them in a store so we can use them as comparison later */
  function save_old_resize_parameters() {
    $resize_parameters.old_hex_width = $tfield.hexWidth
    $resize_parameters.old_hex_height = $tfield.hexHeight
    $resize_parameters.old_gap = $tfield.gap
    $resize_parameters.old_orientation = $tfield.orientation
  }

  // Imports
  let mapImportFiles: FileList
  function importMap() {
    if (!mapImportFiles[0]) return

    let confirm = window.confirm(
      `这将丢弃你当前加载的地图 '${loadedSave.title}'（确认已保存！）\n确定要加载 '${mapImportFiles[0].name}' 吗？`,
    )
    if (!confirm) return

    let r = new FileReader()
    r.readAsText(mapImportFiles[0])
    r.onload = (eb) => {
      let saveData = JSON.parse(eb.target.result as string)
      //console.log(saveData)
      load(saveData, null)
    }
  }

  onMount(() => {
    save_old_resize_parameters()

    hexfriend_blink()
  })

  let hexfriend_affection = 0
  let petting_hexfriend = false
  let hexfriend_hearts = false

  function hexfriend_blink() {
    // console.log(petting_hexfriend)
    if (!(petting_hexfriend || hexfriend_hearts)) {
      // console.log("HUH!?")
      document.getElementById('little-hexfriend').innerHTML = '⟨ -‿- ⟩'
      setTimeout(() => {
        if (!(petting_hexfriend || hexfriend_hearts)) {
          document.getElementById('little-hexfriend').innerHTML = '⟨ •‿• ⟩'
        }
      }, 400)
    }
    setTimeout(hexfriend_blink, rand(60, 120) * 1000)
  }

  function hexfriend_pet() {
    if (!petting_hexfriend) return
    hexfriend_affection += 1

    document.getElementById('floating-hexfriend').style.opacity = `${hexfriend_affection / 100}`

    if (hexfriend_affection > 100) {
      // TODO: Some hearts
      document.getElementById('floating-hexfriend').style.opacity = '0'

      document.getElementById('little-hexfriend').innerHTML = '⟨ ꈍ‿ꈍ ⟩'
      document.getElementById('floating-hexfriend').innerHTML = '⟨ ꈍ‿ꈍ ⟩'
      document.getElementById('floating-hexfriend').style.transitionDuration = '2s'
      document.getElementById('floating-hexfriend').style.opacity = '0'

      hexfriend_hearts = true
      setTimeout(() => {
        document.getElementById('floating-hexfriend').innerHTML = '⟨ >‿• ⟩'
        document.getElementById('floating-hexfriend').style.transitionDuration = '0s'
        hexfriend_hearts = false
        hexfriend_stop_petting()
      }, 2000)
    }
  }

  function hexfriend_stop_petting() {
    if (hexfriend_hearts) return
    document.getElementById('floating-hexfriend').style.opacity = '0'
    document.getElementById('little-hexfriend').innerHTML = '⟨ •‿• ⟩'
    document.getElementById('little-hexfriend').style.cursor = 'grab'
    petting_hexfriend = false
    hexfriend_affection = 0
  }

  function hexfriend_start_petting(e: MouseEvent) {
    if (hexfriend_hearts) return
    document.getElementById('little-hexfriend').innerHTML = '⟨ >‿• ⟩'
    document.getElementById('little-hexfriend').style.cursor = 'grabbing'
    petting_hexfriend = true
  }
</script>

<button
  id="close-tab"
  class:shown={showSettings}
  on:click={() => {
    showSettings = false
  }}
  title={'关闭设置'}
>
  <img src="/assets/img/ui/back.png" alt={'返回'} />
</button>

<div id="settings" class:shown={showSettings}>
  <input
    style="font-size: 20pt; font-family: Segoe UI; border-radius: var(--small-radius); padding: 0.3em; width: 100%; box-sizing: border-box;"
    type="text"
    placeholder={'地图标题'}
    bind:value={loadedSave.title}
  />

  <!-- EXPORT / IMPORT -->
  <span style="display: grid; grid-template-columns: 1fr 1fr; margin-top: 0.25em; gap: 0.25em;">
    <select
      class="outline"
      bind:value={exportType}
      title={'导出'}
      on:change={() => {
        exportMap(exportType)
        exportType = 'Export As...'
      }}
    >
      <option value={Map_Exports.PLACEHOLDER} style="display: none">{'导出为...'}</option>
      <option value={Map_Exports.PNG}>{'PNG'}</option>
      <option value={Map_Exports.SCALED_PNG}>{'缩放 PNG'}</option>
      <option value={Map_Exports.JSON}>{'Hexfriend'}</option>
    </select>

    <button class="file-input-button outline-button" on:click={() => {}} title={'导入'}>
      {'导入'}
      <input
        type="file"
        accept=".hexfriend"
        bind:files={mapImportFiles}
        on:change={() => {
          importMap()
        }}
      />
    </button>

    <!-- 语言固定为简体中文 -->
    <span style="grid-column: 1/3" class="text-disabled">简体中文</span>
  </span>

  <!-- GRID -->
  <div class="setting-container">
    <SettingHeading text={'网格'} bind:toggle={hidden_settings.grid} />
    <div class="settings-hider" class:hidden={hidden_settings.grid}>
      <div class="hider">
        <GridSettings
          bind:comp_terrainLayer
          bind:comp_coordsLayer
          {renderGrid}
          {redrawEntireMap}
          retain_positions={retain_positions_on_resize}
          {save_old_resize_parameters}
        />
      </div>
    </div>
  </div>

  <!-- HEXES -->
  <div class="setting-container">
    <SettingHeading text={'六角格'} bind:toggle={hidden_settings.hexes} />
    <div class="settings-hider" class:hidden={hidden_settings.hexes}>
      <div class="hider">
        <HexesSettings
          bind:comp_coordsLayer
          bind:comp_terrainLayer
          bind:retainIconPosition
          bind:retainPathPosition
          bind:retainTextPosition
          bind:retainIconScale={retain_icon_scale}
          retain_positions={retain_positions_on_resize}
	  loaded_save={loadedSave}
          {save_old_resize_parameters}
          {renderAllHexes}
          {redrawEntireMap}
          retain_positions_orientation_change={retain_positions_on_orientation_change}
          {retain_scale}
        />
      </div>
    </div>
  </div>

  <!-- DIMENSIONS AND SHAPE -->
  <div class="setting-container">
    <SettingHeading text={'形状与大小'} bind:toggle={hidden_settings.dimensions} />
    <div class="settings-hider" class:hidden={hidden_settings.dimensions}>
      <div class="hider">
        <DimensionSettings bind:comp_terrainLayer bind:comp_iconLayer bind:comp_textLayer bind:comp_pathLayer loaded_save={loadedSave} />
      </div>
    </div>
  </div>

  <!-- COORDINATES -->
  <div class="setting-container">
    <SettingHeading text={'坐标'} bind:toggle={hidden_settings.coordinates} />
    <div class="settings-hider" class:hidden={hidden_settings.coordinates}>
      <div class="hider">
        <CoordinateSettings bind:comp_coordsLayer />
      </div>
    </div>
  </div>

  <!-- OVERLAY -->
  <div class="setting-container">
    <SettingHeading text={'覆盖图'} bind:toggle={hidden_settings.overlay} />
    <div class="settings-hider" class:hidden={hidden_settings.overlay}>
      <div class="hider">
        <OverlaySettings bind:showSettings {comp_overlayLayer} loaded_base64={loadedSave.overlay_base64}/>
      </div>
    </div>
  </div>

  <!-- TILE SETS -->
  <div class="setting-container">
    <SettingHeading text={'图块集'} bind:toggle={hidden_settings.tilesets} />
    <div class="settings-hider" class:hidden={hidden_settings.tilesets}>
      <div class="hider">
        <TilesetSettings
          bind:comp_terrainLayer
          bind:comp_terrain_panel
          bind:appState
        />
      </div>
    </div>
  </div>

  <!-- ICON SETS -->
  <div class="setting-container">
    <SettingHeading text={'图标集'} bind:toggle={hidden_settings.iconsets} />
    <div class="settings-hider" class:hidden={hidden_settings.iconsets}>
      <div class="hider">
        <IconsetSettings bind:comp_iconLayer bind:comp_icon_panel bind:appState />
      </div>
    </div>
  </div>

  <!-- GENERATORS -->
  <div class="setting-container">
    <SettingHeading text={'生成器'} bind:toggle={hidden_settings.experimental} />
    <div class="settings-hider" class:hidden={hidden_settings.experimental}>
      <div class="hider">
        <GeneratorSettings bind:show_icon_generator bind:showTerrainGenerator bind:showSettings />
      </div>
    </div>
  </div>

  <!-- Changelog -->
  <a
    href="https://github.com/Aidymouse/Hexfriend/blob/master/changelog.md"
    target={'_blank'}
    style="color: var(--text);"
  >
    <div class="setting-container">
      <h2 class="setting-heading">
        {'更新日志'}
        <button
          ><img alt={'前往更新日志'} src={'/assets/img/ui/arrow.png'} style="transform: rotate(90deg);" /></button
        >
      </h2>
    </div>
  </a>

  <div class="setting-container">
    <h2>{'关于'}</h2>
    <p class="helper-text">
      Hexfriend v4.1.2 - {'"穿梭时空的Hexfriend"'}
    </p>

    <p class="helper-text" style="margin-top: var(--small-radius)">
      {'由 Aidymouse 以及所有可爱的'}
      <a href="https://github.com/Aidymouse/Hexfriend/graphs/contributors"
        >{'贡献者'}</a
      >
      {'共同制作'}
    </p>

    <p class="helper-text" style="margin-top: var(--small-radius)">
      {'在 '}
      <a href="https://github.com/Aidymouse/Hexfriend/wiki">{'wiki'}</a>.
      {' 了解 Hexfriend 的更多高级功能'}
    </p>

    <p class="helper-text" style="margin-top: var(--small-radius)">
      {'Hexfriend 使用 Svelte、Pixi JS 和 Typescript 构建。查看 '}
      <a href="https://www.github.com/Aidymouse/Hexfriend">{'Github'}</a>
      {''}
    </p>

    <p class="helper-text" style="margin-top: var(--small-radius)">
      {'发现 Bug？有想法？来 '}
      <a href="https://discord.gg/Jvws27VmWR">{'Hexfriend Discord'}</a>
      {' 打个招呼'}
    </p>

    <p class="helper-text" style="margin-top: var(--small-radius)">
      {'喜欢 Hexfriend？你可以在 '}
      <a href="https://ko-fi.com/aidymouse">{'Ko-fi'}</a>.
      {' 上捐赠你的辛苦钱'}
    </p>
  </div>

  <div id="hexfriends-house">
    <p
      id="little-hexfriend"
      on:mousedown={hexfriend_start_petting}
      on:mousemove={hexfriend_pet}
      on:mouseup={hexfriend_stop_petting}
      on:mouseleave={hexfriend_stop_petting}
      on:blur={hexfriend_stop_petting}
    >
      ⟨ •‿• ⟩
    </p>
    <p id="floating-hexfriend" class="hexfriend-ungreen">⟨ >‿• ⟩</p>
  </div>
</div>

<style>
  .hexfriend-ungreen {
    color: var(--hexfriend-green) !important;
  }

  #hexfriends-house {
    display: flex;
    justify-content: center;
  }

  #floating-hexfriend,
  #little-hexfriend {
    text-align: center;
    font-size: 20pt;
    font-style: normal;
    color: var(--lightest-background);
    cursor: grab;
    max-width: auto;
  }

  #little-hexfriend {
    transition-duration: 2s;
  }

  #floating-hexfriend {
    position: absolute;
    pointer-events: none;
    color: var(--hexfriend-green);
    opacity: 0;
  }

  #little-hexfriend:active {
    cursor: grabbing;
  }

  .setting-container {
    background-color: var(--light-background);
    padding: 0.5em;
    padding-left: 0.5em;
    padding-right: 0.5em;
    border-radius: var(--large-radius);
    margin-top: 0.25em;
  }

  .setting-heading {
    display: flex;
    position: relative;
  }

  .setting-heading button {
    width: 3em;
    height: 2em;
    position: absolute;
    height: 100%;
    right: 0px;
    border: none;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
  }

  .setting-heading button:hover {
    background-color: var(--lighter-background);
  }

  .setting-heading button img {
    height: 80%;
    transition-duration: 0.2s;
  }

  .setting-heading button img.rotated {
    rotate: 180deg;
    transition-duration: 0.2s;
  }

  .settings-hider {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.2s ease-in-out;
  }

  .hider {
    /* allows for smooth hiding transition */
    overflow-y: hidden;
  }

  .hidden {
    grid-template-rows: 0fr;
  }

  a {
    color: var(--hexfriend-green);
  }

  a:visited {
    color: var(--hexfriend-green);
  }

  #export-map-select {
    border: solid 1px var(--lighter-background);
    border-radius: var(--small-radius);
    background-color: var(--primary-background);
    padding: 0.3125em;
    transition-duration: 0.2s;

    text-align: center;
  }

  #export-map-select:hover {
    background-color: var(--light-background);
  }

  h2 {
    margin: 0;
  }

  p {
    margin: 0;
  }

  #settings {
    position: absolute;
    top: 0;
    left: -19em;
    width: 19em;
    height: 100%;
    background: var(--primary-background);
    box-sizing: border-box;

    padding: 1em;

    overflow-y: scroll;
    transition-duration: 0.2s;
  }

  #settings.shown {
    left: 0px !important;
  }

  #close-tab {
    position: absolute;
    left: -2.5em;
    top: 0;
    width: 2.5em;
    height: 8em;
    border-radius: 0em;
    border-top-right-radius: var(--large-radius);
    border-bottom-right-radius: var(--large-radius);
    border: none;
    background: var(--primary-background);
    transition-duration: 0.2s;
    transition-timing-function: ease;
    padding: 0.5em;
    box-sizing: border-box;
  }

  #close-tab.shown {
    left: 22.75em;
  }

  #close-tab:hover {
    background: var(--light-background);
  }

  #close-tab img {
    margin: 0;
    width: 100%;
  }
</style>
