<script lang="ts">
  import '../../styles/settings.css'

  import Checkbox from '../Checkbox.svelte'
  import ColorInputPixi from '../ColorInputPixi.svelte'
  import SelectGrid from '../SelectGrid.svelte'

  import { tfield } from '../../stores/tfield'

  import { map_shape } from '../../types/settings'
  import { HexOrientation } from '../../types/terrain'
  import { push_undo_state } from '../../lib'

  import { completeUndoState, startUndoState } from '../../lib/undoManager'
  import type { IconLayerIcon } from '../../types'
  export let comp_terrainLayer
  export let comp_coordsLayer

  export let renderGrid: Function
  export let redrawEntireMap: Function
  export let retain_positions: Function
  export let save_old_resize_parameters: Function


</script>

<div class="settings-grid">
  <label for="showGrid">{'显示网格'}</label>
  <!-- Weird bug where the grid wont render if you turn it off then resize the hex flower map ?? -->
  <Checkbox
    checked={$tfield.grid.shown}
    id={'showGrid'}
    on:change={() => {
      startUndoState({TerrainField: { grid: $tfield.grid } }, "切换网格显示")
      $tfield.grid.shown = !$tfield.grid.shown
      completeUndoState({TerrainField: { grid: $tfield.grid } }, "切换网格显示")
      comp_terrainLayer.renderGrid()
    }}
  />
  {#if $tfield.grid.shown}
    <label for="gridThickness">{'网格粗细'}</label>
    <input
      id="gridThickness"
      type="number"
      min="0"
      max="99"
      value={$tfield.grid.thickness}
      on:change={(e) => {
	startUndoState({TerrainField: { grid: $tfield.grid } }, `修改网格粗细 ${$tfield.grid.thickness} -> ${e.target.valueAsNumber}`)
	$tfield.grid.thickness = e.target.valueAsNumber
	completeUndoState({TerrainField: { grid: $tfield.grid } })
        renderGrid()
      }}
    />

    <label for="gridColor">{'网格颜色'}</label>
    <ColorInputPixi
      value={$tfield.grid.stroke}
      on:input={(e) => {
	startUndoState({TerrainField: { grid: $tfield.grid } }, `修改网格描边`, {bounce: true})
	$tfield.grid.stroke = e.detail.number
        renderGrid()
      }}
      on:change={() => {
	completeUndoState({TerrainField: { grid: $tfield.grid } })
      }}
      id={'gridColor'}
    />
  {/if}

  <!-- LARGE HEXES -->
  <label for="showOverlay">{'大六角格'}</label>
  <Checkbox checked={$tfield.largehexes.shown} on:change={e => {
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "切换大六角格显示")
      $tfield.largehexes.shown = !$tfield.largehexes.shown
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
  }} id="showOverlay" />

  {#if $tfield.largehexes.shown}
    <label for="overlayDiameter">{'尺寸'}</label>
    <input type="number" id="overlayDiameter" min={2} value={$tfield.largehexes.diameterInHexes} on:change={(e) => { 
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格尺寸")
      $tfield.largehexes.diameterInHexes = e.target.valueAsNumber
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
    }} />

    <label for="largeHexStroke">{'颜色'}</label>
    <ColorInputPixi
      id={'largeHexStroke'}
      value={$tfield.largehexes.style.color}
      on:input={(e) => {
	startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格颜色", {bounce: true})
	$tfield.largehexes.style.color = e.detail.number
      }} 
      on:change={e => {
	completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
      }}
    />

    <label for="overlayThickness">{'描边粗细'}</label>
    <input type="number" id={'overlayThickness'} value={$tfield.largehexes.style.width} on:change={(e) => {
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格描边粗细")
      $tfield.largehexes.style.width = e.target.valueAsNumber
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
    }}/>

    <label for="overlayOffsetX" title={'水平偏移'}>
      {'水平偏移'}
    </label>
    <input type="number" value={$tfield.largehexes.offset.x} min={0} step={0.25} on:change={(e) => {
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格 X 偏移")
      $tfield.largehexes.offset.x = e.target.valueAsNumber
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
    }} />

    <label for="overlayOffsetY" title={'垂直偏移'}>
      {'垂直偏移'}
    </label>
    <input type="number" value={$tfield.largehexes.offset.y} min={0} step={0.25} on:change={(e) => {
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格 Y 偏移")
      $tfield.largehexes.offset.y = e.target.valueAsNumber
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
    }} />

    <label for="overlayEncompass">{'包含地图边缘'}</label>
    <Checkbox checked={$tfield.largehexes.encompassEdges} id="overlayEncompass" on:change={() => {
      startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格边缘范围")
      $tfield.largehexes.encompassEdges = !$tfield.largehexes.encompassEdges
      completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
    }} />

    {#if $tfield.mapShape == map_shape.SQUARE}
      <label for="big-raised-select-grid">
	{$tfield.orientation == HexOrientation.FLATTOP
          ? '大型凸起列'
          : '大型凹入行'}
      </label>
      <span style={'height: 100%; display: flex; align-items: center;'}>
        <SelectGrid
	  id="big-raised-select-grid"
          options={[
            {
              title: '偶数列',
              value: 'even',
              filename: `${$tfield.orientation == HexOrientation.FLATTOP ? 'bigraisedcolumn' : 'bigindentedrow'}even`,
            },
            {
              title: '奇数列',
              value: 'odd',
              filename: `${$tfield.orientation == HexOrientation.FLATTOP ? 'bigraisedcolumn' : 'bigindentedrow'}odd`,
            },
          ]}
          value={$tfield.largehexes.raised}
	  on:change={(e) => {
	    startUndoState({ TerrainField: { largehexes: $tfield.largehexes } }, "修改大六角格高度")
            $tfield.largehexes.raised = e.detail.value
	    completeUndoState({ TerrainField: { largehexes: $tfield.largehexes } })
	  }}
        />
      </span>
    {/if}
  {/if}
</div>
