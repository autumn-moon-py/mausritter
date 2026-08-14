<script lang="ts">
  import '../../styles/settings.css'

  import { coord_system } from '../../types/coordinates'

  import { data_coordinates } from '../../stores/data'

  import Checkbox from '../Checkbox.svelte'
  import ColorInputPixi from '../ColorInputPixi.svelte'
  import CoordsLayer from '../../layers/CoordsLayer.svelte'

  import { startUndoState, completeUndoState } from '../../lib'

  export let comp_coordsLayer: CoordsLayer
</script>

<div class="settings-grid">
  <label class="helper-text">{'显示坐标可能会减慢添加六角格或更改朝向等地图操作。'}</label>

  <label for="showCoords">{'显示坐标'}</label>
  <Checkbox
    id={'showCoords'}
    checked={$data_coordinates.shown}
    on:change={(e) => {
      startUndoState({ coords: { shown: $data_coordinates.shown } }, '切换坐标显示')
      $data_coordinates.shown = !$data_coordinates.shown
      completeUndoState({ coords: { shown: $data_coordinates.shown } })
    }}
  />

  {#if $data_coordinates.shown}
    <label for="coordsSystem">
      {'坐标系'}
      <sup>
        <a
          href="https://www.redblobgames.com/grids/hexagons/#coordinates"
          target="_blank"
          title={'六角格坐标系说明'}
        >
          ?
        </a>
      </sup>
    </label>
    <select
      id="coordsSystem"
      value={$data_coordinates.system}
      on:change={(e) => {
        startUndoState({ coords: $data_coordinates }, '修改坐标系统')

        $data_coordinates.system = parseInt(e.target.value)
        comp_coordsLayer.updateAllCoordsText()

        completeUndoState({ coords: $data_coordinates })
      }}
    >
      <option value={coord_system.ROWCOL}>{'列, 行'}</option>
      <option value={coord_system.AXIAL}>{'轴向'}</option>
      <option value={coord_system.CUBE}>{'立方体'}</option>
      <option value={coord_system.LETTERNUMBER}>{'字母数字'}</option>
    </select>

    <label for="coordsFill">{'颜色'}</label>
    <ColorInputPixi
      id={'coordsFill'}
      value={$data_coordinates.style.fill}
      on:change={(e) => {
        startUndoState({ coords: { style: $data_coordinates.style } }, '修改坐标填充')
        $data_coordinates.style.fill = e.detail.string
        completeUndoState({ coords: { style: $data_coordinates.style } })
        //comp_coordsLayer.updateAllCoordsText()
      }}
    />

    <label for="coordFontSize">{'字号'}</label>
    <input
      id="coordFontSize"
      type="number"
      value={$data_coordinates.style.fontSize}
      on:change={(e) => {
        startUndoState({ coords: { style: $data_coordinates.style } }, '修改坐标字号')
        $data_coordinates.style.fontSize = e.target.valueAsNumber
        completeUndoState({ coords: { style: $data_coordinates.style } })
      }}
    />

    <label for="coordsOutline">{'描边颜色'}</label>
    <ColorInputPixi 
      value={$data_coordinates.style.stroke}
      on:change={e => {
	startUndoState({coords: {style: $data_coordinates.style}}, "修改坐标描边颜色")
	$data_coordinates.style.stroke = e.detail.string
	completeUndoState({coords: {style: $data_coordinates.style}})
      }}
      id={'coordsOutline'}
    />

    <label for="coordsStrokeThickness">{'描边粗细'}</label>
    <input
      id="coordsStrokeThickness"
      type="number"
      value={$data_coordinates.style.strokeThickness}
      on:change={e => {
	startUndoState({coords: {style: $data_coordinates.style}}, "修改坐标描边宽度")
	$data_coordinates.style.strokeThickness = e.target.valueAsNumber
	completeUndoState({coords: {style: $data_coordinates.style}})
      }}
    />

    <label for="coordSeperator">{'分隔符'}</label>
    <input
      id="coordSeperator"
      type="text"
      value={$data_coordinates.seperator}
      on:change={(e) => {
	startUndoState({coords: {seperator: $data_coordinates.seperator}}, "修改坐标分隔符")
	$data_coordinates.seperator = e.target.value
        comp_coordsLayer.updateAllCoordsText()
	completeUndoState({coords: {seperator: $data_coordinates.seperator}})
      }}
    />

    <label for="coordGap">{'距底部间距'}</label>
    <input
      id="coordGap"
      type="number"
      value={$data_coordinates.gap}
      on:change={(e) => {
	startUndoState({coords: {gap: $data_coordinates.gap}}, "修改坐标间距")
	$data_coordinates.gap = e.target.valueAsNumber
        comp_coordsLayer.updateAllCoordPositions()
	completeUndoState({coords: {gap: $data_coordinates.gap}})
      }}
    />

    {#if $data_coordinates.system == coord_system.ROWCOL || $data_coordinates.system == coord_system.LETTERNUMBER}
      <label for="coord-offset-rowcol-row">{'行偏移'}</label>
      <input
        id="coord-offset-rowcol-row"
        type="number"
        value={$data_coordinates.offsets.row_col.row}
        on:change={(e) => {
	  startUndoState({coords: {offsets: $data_coordinates.offsets}}, "修改坐标偏移 - 行")
	  $data_coordinates.offsets.row_col.row = e.target.valueAsNumber
          comp_coordsLayer.updateAllCoordsText()
	  completeUndoState({coords: {offsets: $data_coordinates.offsets}})
        }}
      />

      <label for="coord-offset-rowcol-col">{'列偏移'}</label>
      <input
        id="coord-offset-rowcol-col"
        type="number"
        value={$data_coordinates.offsets.row_col.col}
        on:change={(e) => {
	  startUndoState({coords: {offsets: $data_coordinates.offsets}}, "修改坐标偏移 - 列")
	  $data_coordinates.offsets.row_col.col = e.target.valueAsNumber
          comp_coordsLayer.updateAllCoordsText()
	  completeUndoState({coords: {offsets: $data_coordinates.offsets}})
        }}
      />
    {/if}

    {#if $data_coordinates.system == coord_system.AXIAL || $data_coordinates.system == coord_system.CUBE}
      <label for="coord-offset-cube-q">{'Q 偏移'}</label>
      <input
        id="coord-offset-cube-q"
        type="number"
        value={$data_coordinates.offsets.cube.q}
        on:change={(e) => {
	  startUndoState({coords: {offsets: $data_coordinates.offsets}}, "修改坐标偏移 - Q")
	  $data_coordinates.offsets.cube.q = e.target.valueAsNumber
	  comp_coordsLayer.updateAllCoordsText()
	  completeUndoState({coords: {offsets: $data_coordinates.offsets}})
        }}
      />

      <label for="coord-offset-cube-r">{'R 偏移'}</label>
      <input
        id="coord-offset-cube-r"
        type="number"
        value={$data_coordinates.offsets.cube.r}
        on:change={(e) => {
	  startUndoState({coords: {offsets: $data_coordinates.offsets}}, "修改坐标偏移 - R")
	  $data_coordinates.offsets.cube.r = e.target.valueAsNumber
          comp_coordsLayer.updateAllCoordsText()
	  completeUndoState({coords: {offsets: $data_coordinates.offsets}})
        }}
      />
    {/if}

    {#if $data_coordinates.system == coord_system.CUBE}
      <label for="coord-offset-cube-s">{'S 偏移'}</label>
      <input
        id="coord-offset-cube-s"
        type="number"
        value={$data_coordinates.offsets.cube.s}
        on:change={(e) => {
	  startUndoState({coords: {offsets: $data_coordinates.offsets}}, "修改坐标偏移 - S")
	  $data_coordinates.offsets.cube.s = e.target.valueAsNumber
          comp_coordsLayer.updateAllCoordsText()
	  completeUndoState({coords: {offsets: $data_coordinates.offsets}})
        }}
      />
    {/if}
  {/if}
</div>

<style>
</style>
