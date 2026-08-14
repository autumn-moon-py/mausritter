<script lang="ts">
  // TYPES
  import type { icon_data } from '../types/data'
  import { Tools } from '../types/toolData'

  import { data_eraser, data_overlay, data_text } from '../stores/data'

  interface terrain_controls {
    leftMouse: string
  }

  interface icon_controls {
    leftMouse: string
  }

  interface path_controls {
    leftMouse: string
  }

  interface text_controls {
    leftMouse: string
    clickAndDrag: string
  }

  // STORES
  import { store_selected_tool } from '../stores/tools'
  import { data_path, data_icon, data_terrain } from '../stores/data'

  export let loaded_save: SaveData

  // COMPONENTS
  import Tooltip from './Tooltip.svelte'

  // TRANSLATION

  /* Terrain */
  let c_terrain: terrain_controls = {
    leftMouse: '放置地形',
  }

  data_terrain.subscribe((n) => {
    c_terrain.leftMouse = '放置地形'
    if (n.usingEyedropper) c_terrain.leftMouse = '取色六角格'
    else if (n.usingPaintbucket && n.usingEraser) c_terrain.leftMouse = '擦除所有同类'
    else if (n.usingPaintbucket) c_terrain.leftMouse = '填充地形'
    else if (n.usingEraser) c_terrain.leftMouse = '擦除六角格'
  })

  /* Icon */
  let c_icon: icon_controls = {
    leftMouse: '放置图标',
  }

  data_icon.subscribe((n: icon_data) => {
    c_icon.leftMouse = '放置图标'
    if (n.usingEraser) c_icon.leftMouse = '擦除图标'
    if (n.dragMode) c_icon.leftMouse = '移动图标'
    if (n.usingEyedropper) c_icon.leftMouse = '取色图标'
  })

  /* Path */
  let c_path: path_controls = {
    leftMouse: '开始新路径',
  }

  data_path.subscribe((n) => {
    c_path.leftMouse = '开始新路径'

    if ($data_path.selectedPath) c_path.leftMouse = '放置路径点'
    else if ($data_path.hoveredPath && !$data_path.dontSelectPaths) c_path.leftMouse = '选择路径'
  })

  /* Text */
  let c_text: text_controls = {
    leftMouse: '放置新文本',
    clickAndDrag: '移动文本',
  }

  data_text.subscribe((n) => {
    c_text.leftMouse = '放置新文本'
    if (n.selectedText) c_text.leftMouse = '取消选择文本'
  })

  /* Eraser */
  let c_eraser = {
    leftMouse: '擦除地形和图标',
  }

  data_eraser.subscribe((n) => {
    c_eraser.leftMouse = '擦除地形和图标'

    if (!n.eraseIcons && !n.eraseTerrain) c_eraser.leftMouse = '什么都没擦！'
    else if (!n.eraseIcons) c_eraser.leftMouse = '仅擦除地形'
    else if (!n.eraseTerrain) c_eraser.leftMouse = '仅擦除图标'
  })

  /* Overlay */
  let c_overlay = {
    clickAndDrag: '移动覆盖图',
  }
</script>

<span>
  <Tooltip control={'右键'} tip={'平移'} />
  <Tooltip control={'滚轮'} tip={'缩放'} />

  {#if $store_selected_tool == Tools.TERRAIN}
    <Tooltip control={'左键'} tip={c_terrain.leftMouse} />
  {:else if $store_selected_tool == Tools.ICON}
    <Tooltip control={'左键'} tip={c_icon.leftMouse} />
  {:else if $store_selected_tool == Tools.PATH}
    <Tooltip control={'左键'} tip={c_path.leftMouse} />
  {:else if $store_selected_tool == Tools.TEXT}
    <Tooltip control={'左键'} tip={c_text.leftMouse} />
    <Tooltip control={'点击并拖动'} tip={c_text.clickAndDrag} />
  {:else if $store_selected_tool == Tools.ERASER}
    <Tooltip control={'左键'} tip={c_eraser.leftMouse} />
  {:else if $store_selected_tool == Tools.OVERLAY}
    <Tooltip control={'点击并拖动'} tip={c_overlay.clickAndDrag} />
  {/if}

  {#if loaded_save.overlay_base64 !== null}
    <Tooltip control="Ctrl+Q" tip={'切换覆盖图'} />
  {/if}

  <Tooltip control="Ctrl+/" tip={'查看快捷键'} style="margin-top: 4px;" />
</span>

<style>
  span {
    position: absolute;
    right: 0;
    bottom: 0;

    padding: 1em;

    width: 12.5em;
    display: flex;

    align-items: flex-end;
    flex-direction: column;
  }
</style>
