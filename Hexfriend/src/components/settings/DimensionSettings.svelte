<script lang="ts">
  import '../../styles/settings.css'

  import { map_shape } from '../../types/settings'
  import { HexOrientation } from '../../types/terrain'

  import { tfield } from '../../stores/tfield'
  import { store_has_unsaved_changes } from '../../stores/flags'

  import TerrainLayer from '../../layers/TerrainLayer.svelte'
  import IconLayer from '../../layers/IconLayer.svelte'
  import PathLayer from '../../layers/PathLayer.svelte'
  import TextLayer from '../../layers/TextLayer.svelte'
  import { completeUndoState, startUndoState } from '../../lib'
  import { type SaveData, type UndoData } from '../../types'

  import { getShiftForSquareExpansion, getShiftForSquareReduction } from '../../helpers'
  import { getHexGridParams } from '../../helpers/hexHelpers'
  export let comp_terrainLayer: TerrainLayer
  export let comp_iconLayer: IconLayer
  export let comp_pathLayer: PathLayer
  export let comp_textLayer: TextLayer

  export let loaded_save: SaveData

  let addOrRemoveMapDimensions: 'add' | 'remove' = 'add'

  function square_expandMapDimension(direction: 'left' | 'top' | 'right' | 'bottom', amount: number) {

    let undoBefore: UndoData = {
	TerrainField: {hexes: $tfield.hexes, rows: $tfield.rows, columns: $tfield.columns, raised: $tfield.raised},
    }

    // Shift must be retrieved before movement has been made, to ensure it's the same as in the fn call
    const shift = getShiftForSquareExpansion(direction, amount, getHexGridParams($tfield))

    if (direction === 'top' || direction === 'left') {
      //undoBefore.icons = loaded_save.icons
      //undoBefore.paths = loaded_save.paths
      //undoBefore.texts = loaded_save.texts
      undoBefore.resize_bump = {x_shift: -shift.x_shift, y_shift: -shift.y_shift}
      comp_iconLayer.moveAllIcons(-shift.x_shift, -shift.y_shift)
      comp_pathLayer.moveAllPaths(-shift.x_shift, -shift.y_shift)
      comp_textLayer.moveAllTexts(-shift.x_shift, -shift.y_shift)
    }

    startUndoState(undoBefore, `按 ${amount} 扩展方形地图`)

    comp_terrainLayer.square_expandMapDimension(direction, amount)

    let undoAfter: UndoData = {
	TerrainField: {hexes: $tfield.hexes, rows: $tfield.rows, columns: $tfield.columns, raised: $tfield.raised},
    }
    if (direction === 'top' || direction === 'left') {
      undoAfter.resize_bump = {x_shift: shift.x_shift, y_shift: shift.y_shift}
    }  

    completeUndoState(undoAfter)

    $store_has_unsaved_changes = true
  }

  function square_reduceMapDimension(direction, amount) {
    if (direction == 'left' || direction == 'right') {
      if ($tfield.columns <= amount) amount = $tfield.columns - 1
      if (amount == 0) return
    }

    if (direction == 'top' || direction == 'bottom') {
      if ($tfield.rows <= amount) amount = $tfield.rows - 1
      if (amount == 0) return
    }

    const shift = getShiftForSquareReduction(direction, amount, getHexGridParams($tfield))

    let undoBeforeReduce: UndoData = { TerrainField: {hexes: $tfield.hexes, rows: $tfield.rows, columns: $tfield.columns, raised: $tfield.raised} }
    if (direction === 'top' || direction === 'left') {
      undoBeforeReduce.resize_bump = {x_shift: -shift.x_shift, y_shift: -shift.y_shift }
    }

    startUndoState(undoBeforeReduce, "缩小方形地图")

    comp_terrainLayer.square_reduceMapDimension(direction, amount)

    let undoAfterReduce: UndoData = { TerrainField: {hexes: $tfield.hexes, rows: $tfield.rows, columns: $tfield.columns, raised: $tfield.raised} }

    if (direction === 'left' || direction === 'top') {
      undoAfterReduce.resize_bump = {x_shift: shift.x_shift, y_shift: shift.y_shift }
      comp_iconLayer.moveAllIcons(-shift.x_shift, -shift.y_shift)
      comp_pathLayer.moveAllPaths(-shift.x_shift, -shift.y_shift)
      comp_textLayer.moveAllTexts(-shift.x_shift, -shift.y_shift)
    } 

    completeUndoState(undoAfterReduce)


    $store_has_unsaved_changes = true
  }

  function flower_expandHexesOut(amount: number) {
    startUndoState({TerrainField: {hexes: $tfield.hexes, hexesOut: $tfield.hexesOut}}, "扩展花朵形地图")
    comp_terrainLayer.flower_expandHexesOut(amount)
    completeUndoState({TerrainField: {hexes: $tfield.hexes, hexesOut: $tfield.hexesOut}})
  }

  function flower_reduceHexesOut(amount: number) {
    startUndoState({TerrainField: {hexes: $tfield.hexes, hexesOut: $tfield.hexesOut}}, "缩小花朵形地图")
    comp_terrainLayer.flower_reduceHexesOut(amount)
    completeUndoState({TerrainField: {hexes: $tfield.hexes, hexesOut: $tfield.hexesOut}})
  }

  function changeMapShape() {
    // TODO: Update zoom when map shape is changed

    let changeConfirm = comp_terrainLayer.areAllHexesBlank() ? true : confirm('确定吗？更改形状将擦除所有六角格。') 

    if (changeConfirm) {
      startUndoState({TerrainField: {hexes: $tfield.hexes, mapShape: $tfield.mapShape}}, "修改地图形状")
      comp_terrainLayer.changeMapShape($tfield.mapShape)
      completeUndoState({TerrainField: {hexes: $tfield.hexes, mapShape: $tfield.mapShape}})
    }

    $store_has_unsaved_changes = true
  }
</script>

<div class="settings-grid">
  <label class="helper-text">{'缩小地图尺寸会完全擦除被移除的六角格。'}</label>

  <label for="mapShape">{'地图形状'}</label>

  <select
    style="min-height: 30px; width: 100%"
    bind:value={$tfield.mapShape}
    on:change={() => {
      changeMapShape()
    }}
  >
    <option value={map_shape.SQUARE}>{'方形'}</option>
    <option value={map_shape.FLOWER}>{'花朵形'}</option>
  </select>
</div>

{#if $tfield.mapShape == map_shape.SQUARE}

  <section id="map-dimensions-container">
    <div id="map-dimensions">
      {#if addOrRemoveMapDimensions == 'add'}
        <button
          style="grid-area: left;"
          on:click={() => {
            square_expandMapDimension('left', 1)
          }}>{'左侧添加'}</button
        >
        <button
          style="grid-area: top;"
          on:click={() => {
            square_expandMapDimension('top', 1)
          }}>{'顶部添加'}</button
        >
        <button
          style="grid-area: bottom;"
          on:click={() => {
            square_expandMapDimension('bottom', 1)
          }}>{'底部添加'}</button
        >
        <button
          style="grid-area: right;"
          on:click={() => {
            square_expandMapDimension('right', 1)
          }}>{'右侧添加'}</button
        >
        <button
          style="grid-area: center;"
          on:click={() => {
            addOrRemoveMapDimensions = 'remove'
          }}
        >
          <img
            src={`/assets/img/tools/addHex_${$tfield.orientation == HexOrientation.FLATTOP ? 'ft' : 'pt'}.png`}
            alt={'添加六角格'}
            title={'添加六角格'}
          />
        </button>
      {:else}
        <button
          style="grid-area: left;"
          on:click={() => {
            square_reduceMapDimension('left', 1)
          }}>{'移除左侧'}</button
        >
        <button
          style="grid-area: top;"
          on:click={() => {
            square_reduceMapDimension('top', 1)
          }}>{'移除顶部'}</button
        >
        <button
          style="grid-area: bottom;"
          on:click={() => {
            square_reduceMapDimension('bottom', 1)
          }}>{'移除底部'}</button
        >
        <button
          style="grid-area: right;"
          on:click={() => {
            square_reduceMapDimension('right', 1)
          }}>{'移除右侧'}</button
        >
        <button
          style="grid-area: center;"
          on:click={() => {
            addOrRemoveMapDimensions = 'add'
          }}
        >
          <img
            src={`/assets/img/tools/removeHex_${$tfield.orientation == HexOrientation.FLATTOP ? 'ft' : 'pt'}.png`}
            alt={'移除六角格'}
            title={'移除六角格'}
          />
        </button>
      {/if}
    </div>
  </section>
	<div class="settings-grid">
	<label>{'行数'}</label>
	<label>{$tfield.rows}</label>

	<label>{'列数'}</label>
	<label>{$tfield.columns}</label>
	</div>
{:else if $tfield.mapShape == map_shape.FLOWER}
  <section id="flower-dimensions-container">
    <p>{'从中心向外扩展六角格'}</p>
    <div id="flower-dimensions-controls-grid">
      <button
        on:click={() => {
          flower_reduceHexesOut(1)
        }}
      >
        -
      </button>
      <div id="counter-container">{$tfield.hexesOut}</div>
      <button
        on:click={() => {
          flower_expandHexesOut(1)
        }}
      >
        +
      </button>
    </div>
  </section>
{/if}

<style>
  #map-dimensions-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #map-dimensions {
    display: grid;

    grid-template-columns: 60px 60px 60px;
    grid-template-rows: 60px 60px 60px;
    gap: 5px;

    grid-template-areas:
      'top-left top top-right'
      'left center right'
      'bottom-left bottom bottom-right';
  }

  #map-dimensions button {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #map-dimensions button img {
    width: 90%;
    height: auto;
  }

  #flower-dimensions-controls-grid {
    display: grid;
    grid-template-columns: 60px 1fr 60px;
    width: 100%;
  }

  #flower-dimensions-container p {
    margin-bottom: 10px;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  #flower-dimensions-controls-grid button {
    height: 60px;
  }

  #flower-dimensions-controls-grid #counter-container {
    width: 100%;
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
  }
</style>
