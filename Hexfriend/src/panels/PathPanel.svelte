<script lang="ts">
  import Checkbox from '../components/Checkbox.svelte'
  import ColorInputPixi from '../components/ColorInputPixi.svelte'
  import SelectGrid from '../components/SelectGrid.svelte'
  import type PathLayer from '../layers/PathLayer.svelte'
  import type { ListedPathStyle, PathStyle } from '../types/path'
  import * as PIXI from 'pixi.js'

  import { startUndoState, completeUndoState } from '../lib/undoManager'

  import { store_has_unsaved_changes } from '../stores/flags'
  import { data_path } from '../stores/data'

  import { textStylesMatch } from '../helpers'
  import { pathStylesMatch } from '../helpers/pathHelpers'
  export let comp_pathLayer: PathLayer
  export let show: boolean

  const DEV_MODE = false

  /* Path Style Management */

  export let loaded_path_styles: ListedPathStyle[] = []

  // Idk why this makes the matching fn update but it does
  data_path.subscribe((n) => {
    loaded_path_styles = loaded_path_styles
  })

  let pathID = 0
  loaded_path_styles.forEach((pathStyle) => {
    pathID = Math.max(pathID, pathStyle.id + 1)
  })

  function styleMatchesData(pathStyle: PathStyle): boolean {
    return JSON.stringify(pathStyle) == JSON.stringify($data_path.style)
  }

  function newPathStyle() {
    let name = ""
    while (name.trim() === "") {
      name = prompt('你想给这条路径取什么名字？')
    }
    if (name == null) return

    startUndoState({path_styles: loaded_path_styles}, "新建路径样式")


    loaded_path_styles = [
      ...loaded_path_styles,
      {
        display: name,
        style: { ...$data_path.style },
	filled: $data_path.filled,
	fillStyle: { ...$data_path.fillStyle },
        id: pathID,
      },
    ]
    pathID += 1

    completeUndoState({path_styles: loaded_path_styles})

    $store_has_unsaved_changes = true
  }

  let menuX = 0
  let menuY = 0

  function updateStyleToMatch() {
    if ($data_path.contextPathId == null) return

    let styleToEdit: ListedPathStyle = loaded_path_styles.find((ps) => ps.id == $data_path.contextPathId)

    startUndoState({path_styles: loaded_path_styles}, "将路径样式更新为匹配")

    styleToEdit.style = {...$data_path.style}
    //applyStyle({ ...$data_path.style })
    //styleToEdit = styleToEdit
    loaded_path_styles = loaded_path_styles
    completeUndoState({path_styles: loaded_path_styles})

    $data_path.contextPathId = null
  }

  function deletePathStyle() {
    if ($data_path.contextPathId == null) return
    if (!confirm('删除这条路径样式？')) return

    startUndoState({path_styles: loaded_path_styles}, "删除路径样式")
    loaded_path_styles = loaded_path_styles.filter((ps) => ps.id != $data_path.contextPathId)
    completeUndoState({path_styles: loaded_path_styles})

    $data_path.contextPathId = null

    $store_has_unsaved_changes = true
  }

  function renameStyle() {
    if ($data_path.contextPathId == null) return

    let styleToEdit: ListedPathStyle = loaded_path_styles.find((ps) => ps.id == $data_path.contextPathId)
    $data_path.contextPathId = null

    let styleName = ""
    while (styleName.trim() === "") {
      styleName = prompt('你想给这条路径取什么名字？')
    }
    if (styleName === null) return

    startUndoState({path_styles: loaded_path_styles}, "重命名路径样式")

    styleToEdit.display = styleName
    loaded_path_styles = loaded_path_styles

    $store_has_unsaved_changes = true

    completeUndoState({path_styles: loaded_path_styles})
  }

  export const applyPathStyles = (path_styles: ListedPathStyle[]) => {
    $data_path.contextPathId = null
    loaded_path_styles = path_styles
  }

  // Path Controls
  function deselectPath() {
    comp_pathLayer.deselectPath()
  }

  function duplicateStyle() {
    let contextPathStyle: ListedPathStyle = loaded_path_styles.find((ps) => ps.id == $data_path.contextPathId)

    startUndoState({path_styles: loaded_path_styles}, "复制路径样式")

    pathID += 1

    let new_path_style = structuredClone(contextPathStyle)
    new_path_style.id = pathID

    loaded_path_styles = [
      ...loaded_path_styles,
      new_path_style,
    ]

    $data_path.contextPathId = null

    completeUndoState({path_styles: loaded_path_styles})

    $store_has_unsaved_changes = true
  }


  // Bit of state juggling here but this lets us do instant updates to styles on:input and then apply proper undo state changes on:change
  // Just remember to follow up all on:inputs with on:change events!
  let style_prior_to_input: PathStyle | null = null

  const inputStyle = (style: Partial<PathStyle>) => {

    $data_path.style = {...$data_path.style, ...style}
    if ($data_path.selectedPath) {
      if (style_prior_to_input === null) {
	style_prior_to_input = structuredClone($data_path.selectedPath.style)
      }
      $data_path.selectedPath.style = {...$data_path.style}
    }
  }

  /* Applies provided style + keeps data up to date */
  const applyStyle = (style: Partial<PathStyle>) => {
    /* TODO: replace with real matching fn */
    if (style_prior_to_input === null && pathStylesMatch({...$data_path.style, ...style}, $data_path.style)) { return }

    $data_path.style = {...$data_path.style, ...style}

    if ($data_path.selectedPath) {
      if (style_prior_to_input !== null) { 
	$data_path.selectedPath.style = style_prior_to_input 
	style_prior_to_input = null
      }
      comp_pathLayer.updatePathStylePanelControl($data_path.selectedPath, $data_path.style)
    }  
  }
</script>

<div
  class="panel"
  style={show ? "" : "display: none"}
  on:pointerdown={() => {
    if ($data_path.contextPathId) $data_path.contextPathId = null
  }}
>
  <div id="controls">
    <span>
      <ColorInputPixi
	value={$data_path.style.color}
	id={'pathColor'} 
	on:input={e => {inputStyle({color: e.detail.number})}} 
	on:change={e => {applyStyle({color: e.detail.number})}}
      />
      <input id="pathThickness" type="number" min={1} value={$data_path.style.width} on:change={e => applyStyle({width: e.target.valueAsNumber}) } />
    </span>

    <span class="path-control-grid">
      <p>{'线条端点'}</p>
      <span>
        <SelectGrid
          options={[
            {
              title: '圆头端点',
              value: PIXI.LINE_CAP.ROUND,
              filename: 'lineendround',
            },
            {
              title: '平头端点',
              value: PIXI.LINE_CAP.BUTT,
              filename: 'lineendbutt',
            },
            {
              title: '方头端点',
              value: PIXI.LINE_CAP.SQUARE,
              filename: 'lineendsquare',
            },
          ]}
          value={$data_path.style.cap}
	  on:change={e => {
	    applyStyle({cap: e.detail.value})
	  }}
        />
      </span>
    </span>

    <span class="path-control-grid">
      <p>{'拐角'}</p>
      <span>
        <SelectGrid
          options={[
            {
              title: '圆角',
              value: PIXI.LINE_JOIN.ROUND,
              filename: 'linecornerround',
            },
            {
              title: '尖角',
              value: PIXI.LINE_JOIN.MITER,
              filename: 'linecornermiter',
            },
            {
              title: '斜角',
              value: PIXI.LINE_JOIN.BEVEL,
              filename: 'linecornerbevel',
            },
          ]}
          value={$data_path.style.join}
	  on:change={(e) => {
	    applyStyle({join: e.detail.value})
	  }}
        />
      </span>
    </span>

    <span class="path-control-grid">
      <label for="dashed-line">{'虚线'}</label>
      <Checkbox
        checked={$data_path.style.dashed}
        on:change={(e) => { applyStyle({dashed: !$data_path.style.dashed}) }}
      />
    </span>

    {#if $data_path.style.dashed}
      <span class="path-control-grid" id="dash-param-grid">
        <label for="dash-length">{'虚线长'}</label>
        <input id="dash-length" type="number" value={$data_path.style.dash_length} min={1} on:change={e => {
	  applyStyle({dash_length: e.target.valueAsNumber})
	}} />
        <label for="dash-gap">{'间隔'}</label>
        <input id="dash-gap" type="number" value={$data_path.style.dash_gap} min={1} on:change={e => {
	  applyStyle({dash_gap: e.target.valueAsNumber})
	}} />
      </span>
    {/if}

    <span class="path-control-grid">
      <label for="path-filled">{'填充'}</label>
      <Checkbox
	id="path-filled"
        checked={$data_path.style.filled}
        on:change={(e) => { applyStyle({filled: !$data_path.style.filled}) }}
      />
    </span>

    {#if $data_path.style.filled}
    <span class="path-control-grid">
      <label for="path-fill-color" class="left-center-text" >{'填充颜色'}</label>
      <div style="display: flex; gap: 0.5em">
	<ColorInputPixi
	  id="path-fill-color"
	  value={$data_path.style.fill_color}
	  on:change={(e) => { applyStyle({fill_color: e.detail.number}) }}
	/>

	<button class="outline-button" on:click={e => {
	  applyStyle({fill_color: $data_path.style.color})
	}}>{'匹配描边'}</button>
      </div>
    </span>
    <span class="path-control-grid">
      <label for="path-fill-opacity">{'填充不透明度'}</label>
      <input 
	id="path-fill-opacity" 
	type="range" 
	max="1" 
	min="0.05" 
	step="0.05" 
	value={$data_path.style.fill_opacity} 
	on:input={e => inputStyle({fill_opacity: e.target.valueAsNumber})} 
	on:change={e => applyStyle({fill_opacity: e.target.valueAsNumber})} 
      />
    </span>
    {/if}
  </div>

  {#if DEV_MODE}
  <div style="background-color: maroon; padding: 0.5em">
    <button on:click={() => comp_pathLayer.debug_logPathState()}>Log Text State</button>
  </div>
  {/if}

  {#if $data_path.selectedPath}
    <div id="selected-path-controls">
      <button
        on:click={() => {
          $data_path.add_to = $data_path.add_to == 'start' ? 'end' : 'start'
        }}>{'切换端点'}</button
      >
      <button
        on:click={() => {
          deselectPath()
        }}
      >
        {'取消选择路径'}
      </button>
      <button
        on:click={() => {
          comp_pathLayer.remove_latest_point($data_path.selectedPath)
        }}>{'移除最后一点'}</button
      >
      <button
        class="evil"
        on:click={() => {
          comp_pathLayer.deletePathPanelControl($data_path.selectedPath)
        }}>{'删除路径'}</button
      >
    </div>
  {/if}

  <!-- PATH STYLES -->
  <div id="path-styles" style={$data_path.selectedPath ? 'padding-top: 0;' : ''}>
    <!-- Path Style Listing -->
    <div style="display: flex; gap: 5px; flex-wrap: wrap">
      {#each loaded_path_styles as pb (pb.id)}
        <button
          on:click={() => {
	    applyStyle(pb.style)
          }}
          class:selected={styleMatchesData(pb.style)}
          on:contextmenu={(e) => {
            e.preventDefault()
            menuX = e.clientX
            menuY = e.clientY
            $data_path.contextPathId = pb.id
          }}
        >
          {pb.display}
        </button>
      {/each}
      <button
        class="green-button"
        style="width: 28px;"
        on:click={() => {
          newPathStyle()
        }}
        title={'保存当前路径样式'}
      >
        +
      </button>
    </div>
  </div>
</div>

<!-- Path Style Context Menu -->
{#if $data_path.contextPathId != null}
  <div class={'context-menu'} style={`top: ${menuY}px; left: ${menuX}px`}>
    <button on:click={updateStyleToMatch} title={'将当前样式更新为上方设置的样式。'}>
      {'更新样式'}
    </button>
    <button on:click={renameStyle}>{'重命名'}</button>
    <button on:click={duplicateStyle}>{'复制'}</button>
    <button on:click={deletePathStyle}>{'删除'}</button>
  </div>
{/if}

<style>
  span {
    display: flex;
    gap: 0.5em;
  }

  div {
    color: var(--text);
  }

  #controls {
    padding: 1em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  #controls input[type='number'] {
    flex-grow: 1;
  }

  #selected-path-controls {
    background-color: var(--light-background);
    padding: 0.625em;
    display: grid;
    grid-template-rows: auto;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 0.3125em;
  }

  #path-styles {
    padding: 0.625em;
    background-color: var(--light-background);
  }

  .path-control-grid {
    display: grid;
    grid-template-columns: 3fr 4fr;
  }

  .path-control-grid p {
    margin: 0;
    display: flex;
    align-items: center;
  }

  #dash-param-grid {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    width: 100%;
    gap: 0.25em;
  }

  #dash-param-grid input {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }
</style>
