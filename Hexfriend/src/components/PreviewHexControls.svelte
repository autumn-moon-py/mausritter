<!-- Wrapper for controls that handle a preview hex controls -->

<script lang="ts">
  import { type PreviewHexInfo } from '../types'
  import ColorInput from './ColorInput.svelte'
  import * as PIXI from 'pixi.js'
  import { DEFAULT_BLANK_HEX_COLOR } from '../types/defaults'

  export let preview_hex_info: PreviewHexInfo
</script>

<label for="hex-width">{'六角格宽度'}</label>
<input id="hex-width" type="number" bind:value={preview_hex_info.width} />
<label for="hex-height">{'六角格高度'}</label>
<input id="hex-height" type="number" bind:value={preview_hex_info.height} />
<label for="hex-color">{'颜色'}</label>
<div style="display: flex; gap: 0.5em">
  <ColorInput name="hex-color" bind:value={preview_hex_info.color} />
  <button
    on:click={() => {
      preview_hex_info.color = new PIXI.Color(DEFAULT_BLANK_HEX_COLOR).toHex()
    }}
  >
    重置
  </button>
</div>

<style>
  input {
    height: 2em;
    border-radius: var(--small-radius);
  }

  label {
    height: 100%;
    display: flex;
    align-items: center;
  }
</style>
