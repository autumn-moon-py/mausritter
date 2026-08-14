<script lang="ts">
  import '../../styles/settings.css'

  import ColorInputPixi from '../ColorInputPixi.svelte'
  import SelectGrid from '../SelectGrid.svelte'
  import ImageCheckbox from '../ImageCheckbox.svelte'

  import { HexOrientation } from '../../types/terrain'
  import { map_shape } from '../../types/settings'

  import { tfield } from '../../stores/tfield'
  import { resize_parameters } from '../../stores/resize_parameters'
  import { store_has_unsaved_changes } from '../../stores/flags'

  import { get_radius_from_width_height, get_width_height_from_radius } from '../../helpers/hexHelpers'
  import { data_terrain } from '../../stores/data'

  import { startUndoState, completeUndoState } from '../../lib'
  import { type SaveData } from '../../types'

  export let comp_coordsLayer
  export let comp_terrainLayer
  export let loaded_save: SaveData

  export let retain_positions: Function
  export let retain_positions_orientation_change: Function
  export let retain_scale: Function
  export let save_old_resize_parameters: Function
  export let renderAllHexes: Function
  export let redrawEntireMap: Function

  export let retainIconPosition: boolean
  export let retainPathPosition: boolean
  export let retainTextPosition: boolean

  export let retainIconScale: boolean

  function changeOrientation(to: HexOrientation) {
    //$tfield.hexWidth, $tfield.hexHeight = $tfield.hexHeight, $tfield.hexWidth

    let t = $tfield.hexWidth
    $tfield.hexWidth = $tfield.hexHeight
    $tfield.hexHeight = t
    $tfield.orientation = to

    comp_terrainLayer.applyOrientationChange(to)

    $store_has_unsaved_changes = true

    $data_terrain.genPreview = true

    comp_coordsLayer.cullUnusedCoordinates()
    comp_coordsLayer.updateAllCoordPositions()
    comp_coordsLayer.updateAllCoordsText()
    comp_coordsLayer.populateBlankHexes()

    retain_positions_orientation_change()
    retain_scale()

    // Width and Height flip so we save them as old params
    save_old_resize_parameters()
    //redrawEntireMap()
  }
</script>

<div class="settings-grid">
  <label for="blankHexColor">{'空白六角格颜色'}</label>
  <div style="display: flex; gap: 0.25em; align-items: center;">
    <ColorInputPixi
      value={$tfield.blankHexColor}
      on:input={(e) => {
        startUndoState({ TerrainField: { blankHexColor: $tfield.blankHexColor } }, "修改空白六角格颜色", {bounce: true})
        $tfield.blankHexColor = e.detail.number
        renderAllHexes()
      }}
      on:change={() => {
        completeUndoState({ TerrainField: { blankHexColor: $tfield.blankHexColor } })
      }}
      id={'blankHexColor'}
    />

    <button
      style={'height: fit-content;'}
      on:click={() => {
        startUndoState({ TerrainField: { blankHexColor: $tfield.blankHexColor } }, "重置空白六角格颜色")
        $tfield.blankHexColor = 0xf2f2f2
        completeUndoState({ TerrainField: { blankHexColor: $tfield.blankHexColor } })
      }}>{'重置'}</button
    >
  </div>

  <label for="hex-orientation-select-grid">{'六角格朝向'}</label>
  <div style={'height: 100%; display: flex; align-items: center;'}>
    <SelectGrid
      id="hex-orientation-select-grid"
      options={[
        { title: '平顶', value: HexOrientation.FLATTOP, filename: 'flatTop' },
        { title: '尖顶', value: HexOrientation.POINTYTOP, filename: 'pointyTop' },
      ]}
      value={$tfield.orientation}
      on:change={() => {
        startUndoState({ 
	  TerrainField: {
	    hexes: $tfield.mapShape === map_shape.SQUARE ? $tfield.hexes : undefined,
	    hexWidth: $tfield.hexWidth,
	    hexHeight: $tfield.hexHeight,
	    orientation: $tfield.orientation 
	  },
	  icons: retainIconPosition ? loaded_save.icons : undefined,
	  paths: retainPathPosition ? loaded_save.paths : undefined,
	  texts: retainPathPosition ? loaded_save.texts : undefined,
	}, `Change Orientation [${retainIconPosition ? 'I' : '-'}${retainPathPosition ? 'P' : '-'}${retainTextPosition ? 'T' : '-'}${$tfield.mapShape === map_shape.SQUARE ? 'H' : '-'}]`)

        changeOrientation($tfield.orientation === HexOrientation.FLATTOP ? HexOrientation.POINTYTOP : HexOrientation.FLATTOP)

        completeUndoState({
	  TerrainField: {
	    hexes: $tfield.mapShape === map_shape.SQUARE ? $tfield.hexes : undefined,
	    hexWidth: $tfield.hexWidth,
	    hexHeight: $tfield.hexHeight,
	   orientation: $tfield.orientation 
	  },
	  icons: retainIconPosition ? loaded_save.icons : undefined,
	  paths: retainPathPosition ? loaded_save.paths : undefined,
	  texts: retainPathPosition ? loaded_save.texts : undefined,
	})
      }}
    />
  </div>

  {#if $tfield.mapShape == map_shape.SQUARE}
    <label for="raised-select-grid">
      {$tfield.orientation == HexOrientation.FLATTOP ? '凸起列' : '凹入行'}
    </label>
    <span style={'height: 100%; display: flex; align-items: center;'}>
      <SelectGrid
	id="raised-select-grid"
        options={[
          {
            title: '偶数列',
            value: 'even',
            filename: `${$tfield.orientation == HexOrientation.FLATTOP ? 'raisedcolumn' : 'indentedrow'}even`,
          },
          {
            title: '奇数列',
            value: 'odd',
            filename: `${$tfield.orientation == HexOrientation.FLATTOP ? 'raisedcolumn' : 'indentedrow'}odd`,
          },
        ]}
        value={$tfield.raised}
        on:change={(e) => {
	  // TODO: this could be more efficient I'm sure.
	  startUndoState({TerrainField: $tfield}, "修改高度")
          $tfield.raised = e.detail.value
          if ($tfield.orientation == HexOrientation.FLATTOP) {
            comp_terrainLayer.square_updateRaisedColumn()
          } else {
            comp_terrainLayer.square_changeIndentedRow()
          }
          comp_coordsLayer.cullUnusedCoordinates()
	  completeUndoState({TerrainField: $tfield})
        }}
      />
    </span>
  {/if}

  <label for="hexWidth">{'六角格宽度'}</label>
  <input
    id="hexWidth"
    type="number"
    min={1}
    value={$tfield.hexWidth}
    on:change={(e) => {
      if (Number.isNaN(e.currentTarget.valueAsNumber)) {
        $tfield.hexWidth = $resize_parameters.old_hex_width
        return
      }

      startUndoState({
	TerrainField: {hexWidth: $tfield.hexWidth},
	icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      }, "Change Hex Width")

      $tfield.hexWidth = e.target.valueAsNumber

      redrawEntireMap()
      comp_coordsLayer.updateAllCoordPositions()
      retain_positions()
      retain_scale()
      save_old_resize_parameters()

      completeUndoState({
	TerrainField: {hexWidth: $tfield.hexWidth},
	icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      })
    }}
  />

  <label for="hexHeight">{'六角格高度'}</label>
  <input
    id="hexHeight"
    type="number"
    min={1}
    value={$tfield.hexHeight}
    on:change={(e) => {
      if (Number.isNaN(e.currentTarget.valueAsNumber)) {
        $tfield.hexHeight = $resize_parameters.old_hex_height
        return
      }
      startUndoState({
	TerrainField: {hexHeight: $tfield.hexHeight},
	icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      })

      $tfield.hexHeight = e.target.valueAsNumber

      redrawEntireMap()
      comp_coordsLayer.updateAllCoordPositions()
      retain_positions()
      retain_scale()
      save_old_resize_parameters()

      completeUndoState({
	TerrainField: {hexHeight: $tfield.hexHeight},
	icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      })
    }}
  />

  <label for="hex-radius">{'按半径设置尺寸'}</label>
  <span>
    <button
      on:click={() => {
        let currentRadius = get_radius_from_width_height($tfield.hexWidth, $tfield.hexHeight, $tfield.orientation)

        let radius = +prompt('输入六角格半径', currentRadius.toString())
        console.log(radius)
        if (Number.isNaN(radius) || radius < 1) return

	startUndoState({
	  TerrainField: {hexWidth: $tfield.hexWidth, hexHeight: $tfield.hexHeight },
	  icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	  paths: retainPathPosition ? loaded_save.paths : undefined,
	  texts: retainTextPosition ? loaded_save.texts : undefined,
	  }, "Set Hex Size by Radius")

        let new_dims = get_width_height_from_radius(radius, $tfield.orientation)

        $tfield.hexWidth = new_dims.width
        $tfield.hexHeight = new_dims.height

        redrawEntireMap()

        retain_positions()
        retain_scale()
        save_old_resize_parameters()

        comp_coordsLayer.updateAllCoordPositions()

	completeUndoState({
	  TerrainField: {hexWidth: $tfield.hexWidth, hexHeight: $tfield.hexHeight },
	  icons: retainIconPosition || retainIconScale ? loaded_save.icons : undefined,
	  paths: retainPathPosition ? loaded_save.paths : undefined,
	  texts: retainTextPosition ? loaded_save.texts : undefined,
	})
      }}>{'设置'}</button
    >
  </span>

  <label for="hexGap">{'间距'}</label>
  <input
    id="hexGap"
    type="number"
    min="0"
    max="99"
    value={$tfield.gap}
    on:focus={() => {}}
    on:change={(e) => {

      //let undoStartState = {TerrainField: { grid: $tfield.grid } }
      startUndoState({
	TerrainField: {gap: $tfield.gap},
	icons: retainIconPosition ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      }, `Change Grid Gap`)

      $tfield.gap = e.target.valueAsNumber

      redrawEntireMap()
      comp_coordsLayer.updateAllCoordPositions()
      retain_positions()
      save_old_resize_parameters()

      completeUndoState({
	TerrainField: { gap: $tfield.gap },
	icons: retainIconPosition ? loaded_save.icons : undefined,
	paths: retainPathPosition ? loaded_save.paths : undefined,
	texts: retainTextPosition ? loaded_save.texts : undefined,
      })
    }}
  />

  <label title={'六角格缩放时，选中的对象将保持相对于六角格中心的位置。'}>
    {'保持位置'}
    <sup id="retain-position-tip" title={'六角格缩放时，选中的对象将保持相对于六角格中心的位置。'}>?</sup>
  </label>
  <div id="retain-position-container">
    <div id="retain-position-grid">
      <ImageCheckbox
        image_filename={'/assets/img/tools/icon.svg'}
        title={'图标'}
        bind:checked={retainIconPosition}
      />
      <ImageCheckbox
        image_filename={'/assets/img/tools/path.svg'}
        title={'路径'}
        bind:checked={retainPathPosition}
      />
      <ImageCheckbox
        image_filename={'/assets/img/tools/text.svg'}
        title={'文本'}
        bind:checked={retainTextPosition}
      />
    </div>
  </div>
  <label title={'六角格缩放时，选中的对象将保持相对于六角格中心的位置。'}>
    {'更新图标缩放'}
    <sup id="retain-position-tip" title={'缩放六角格时，图标将按新尺寸更新缩放比例。警告：缩放比例由放置图标时请求的尺寸计算。如果你在关闭此选项时调整过六角格大小，图标尺寸可能会跳到意想不到的值。'}>?</sup>
  </label>
  <div id="retain-position-container">
    <div id="retain-position-grid">
      <ImageCheckbox
        image_filename={'/assets/img/tools/icon.svg'}
        title={'图标'}
        bind:checked={retainIconScale}
      />
    </div>
  </div>
</div>

<style>
  #retain-position-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #retain-position-grid {
    height: 2em;
    display: flex;
    border-radius: var(--small-radius);
    overflow: hidden;
  }

  #retain-position-tip {
    color: var(--hexfriend-green);
  }
</style>
