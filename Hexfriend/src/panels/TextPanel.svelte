<script lang="ts">
  import ColorInput from "../components/ColorInput.svelte";
  import CustomValueToggle from "../components/CustomValueToggle.svelte";
  import SelectGrid from "../components/SelectGrid.svelte";

  import type TextLayer from "../layers/TextLayer.svelte";
  import type { ListedTextStyle, TextStyle } from "../types/text";

  import { data_text } from "../stores/data";
  import { store_has_unsaved_changes } from "../stores/flags";

  import ColorInputPixi from "../components/ColorInputPixi.svelte"
  import { textStylesMatch } from "../helpers"
  import { cancelProspectiveUndoState, completeUndoState, startUndoState } from "../lib"

  export let show: boolean;

  let annoyance_counter = 0;
  let style_name_retry = [
    {from: 0, to: 4, string: '不，真的，它需要一个名字。'},
    {from: 5, to: 9, string: '你是故意考验我的耐心吗？'},
    {from: 10, to: 10, string: '叫"大陆"怎么样？'},
    {from: 11, to: 11, string: '或者叫"标题"'},
    {from: 12, to: 12, string: '或者叫"男爵领"！不...等等...那个已经被人用了。'},
    {from: 13, to: 13, string: '好吧，你想名字的时候我先走了。'},
    {from: 14, to: 20, string: '还在这儿？'},
    {from: 21, to: 21, string: '我真的帮不了你，我看不到你的地图！'},
    {from: 22, to: 22, string: '大概是因为这个对话框还开着。'},
    {from: 23, to: 23, string: '能请你随便取个名字吗？'},
    {from: 24, to: 24, string: '你已经尝试输入空名字25次了。'},
    {from: 25, to: 25, string: '……'},
    {from: 26, to: 28, string: '唉。'},
    {from: 29, to: 29, string: '……'},
    {from: 30, to: 35, string: '*咳咳*'},
    {from: 36, to: 36, string: '……'},
    {from: 37, to: 45, string: '好吧那么……'},
    {from: 46, to: 46, string: '我先走了……'},
    {from: 47, to: 47, string: '再见。'},
    {from: 48, to: 48, string: ''},
    {from: 49, to: 75, string: '你知道吗，你可以在设置菜单里摸我。'},
    {from: 76, to: 76, string: '好了我真的要走了。再见。想个名字吧，如果行的话。'},
    {from: 77, to: 77, string: '我爱你。'},
    {from: 78, to: 78, string: ""},
  ];

	export let comp_textLayer: TextLayer;

	/* This is fucking barbaric... but I can't find a way to make to make it work */
	function focus(node: HTMLTextAreaElement) {
		setTimeout(() => {
			node.focus();
		}, 10);
	}

	let fonts = [
		"Arial",
		"Comic Sans MS",
		"Segoe UI",
		"Times New Roman",
		"Trebuchet MS",
		"Lora",
		"Tilt Neon",
		"Shantell Sans",
		"Smokum",
		"Merriweather",
	];

	export let loaded_text_styles: ListedTextStyle[];
	let styleId = 0;
	loaded_text_styles.forEach((ts) => { styleId = Math.max(ts.id, styleId) });

	function selectedMatches(style: TextStyle): boolean {
	      return textStylesMatch(style, $data_text.style)
	}

	function changeTextStyle(style: Partial<TextStyle>) {
		if ($data_text.selectedText) {
		  comp_textLayer.panelControl_applyTextStyle($data_text.selectedText, {...$data_text.style, ...style})
		}
		$data_text.style = { ...$data_text.style, ...style };
		loaded_text_styles = loaded_text_styles; /* Updates the selected button */
		$store_has_unsaved_changes = true;
	}

	function newTextStyle() {
		let name = prompt('你想给这个文本样式取什么名字？');
		if (name == null) return;
		while (name.trim() === "") {
		  let retry_string = style_name_retry.find(r => r.from <= annoyance_counter && annoyance_counter <= r.to)?.string ?? ""
		  let name = prompt(retry_string)
		  annoyance_counter += 1;
		  if (name === null) {
		    annoyance_counter = 0
		    return
		  }
		}

		if ($data_text.selectedText) {
		  //cancelProspectiveUndoState()
		  comp_textLayer.deselectText()
		}

		styleId += 1;
		const new_text_style = structuredClone($data_text.style)

		startUndoState({text_styles: loaded_text_styles}, `新建文本样式 ${name}`)

		loaded_text_styles = [
		  ...loaded_text_styles,
		  {
		    display: name,
		    style: new_text_style,
		    id: styleId,
		  },
		];

		completeUndoState({text_styles: loaded_text_styles})
		/*
		// This method has trouble with if you edit text, then mess with path styles in the middle
		if ($data_text.selectedText) {
		  comp_textLayer.selectText($data_text.selectedText)
		  //comp_textLayer.deselectText()
		}
		*/
		$store_has_unsaved_changes = true;
	}

	let menuX = 0;
	let menuY = 0;

	function updateListedStyleToMatch() {
		if ($data_text.contextStyleId == null) return;


		let styleToUpdate = loaded_text_styles.find(
			(ts) => ts.id == $data_text.contextStyleId,
		);
		if ($data_text.selectedText) {
		  comp_textLayer.deselectText()
		}
		startUndoState({text_styles: loaded_text_styles}, `将文本样式 ${styleToUpdate.display} 更新为匹配`)
		styleToUpdate.style = { ...$data_text.style };

		loaded_text_styles = loaded_text_styles;
		$data_text.contextStyleId = null;
		$store_has_unsaved_changes = true;
		completeUndoState({text_styles: loaded_text_styles})
	}

	function renameStyle() {
	  if ($data_text.contextStyleId == null) return;

	  let styleToEdit: ListedTextStyle = loaded_text_styles.find((ps) => ps.id == $data_text.contextStyleId);
	  $data_text.contextStyleId = null;

	  let styleName = ""
	  while (styleName.trim() === "") {
	    styleName = prompt('你想给这个文本样式取什么名字？');
	  }
	  if (styleName === null) return;


	  if ($data_text.selectedText) { comp_textLayer.deselectText() }
	  startUndoState({text_styles: loaded_text_styles}, `将文本样式 ${styleToEdit.display} 重命名为 ${styleName}`)

	  styleToEdit.display = styleName;
	  loaded_text_styles = loaded_text_styles;
	  $store_has_unsaved_changes = true;
	  completeUndoState({text_styles: loaded_text_styles})
	}

	function duplicateStyle() {
	  if ($data_text.contextStyleId == null) return;

	  let styleToDupe = loaded_text_styles.find((ts) => ts.id == $data_text.contextStyleId);

	  if ($data_text.selectedText) { comp_textLayer.deselectText() }
	  startUndoState({text_styles: loaded_text_styles}, `删除文本样式 ${styleToDupe.display}`)

	  styleId += 1;
	  loaded_text_styles = [
	      ...loaded_text_styles,
	    {
	      display: styleToDupe.display,
	      style: { ...styleToDupe.style },
	      id: styleId,
	    },
	  ];

	  $data_text.contextStyleId = null;
	  $store_has_unsaved_changes = true;

	  completeUndoState({text_styles: loaded_text_styles})
	}

	function deleteStyle() {
	  if (!confirm('确定要删除这个文本样式吗？')) { return }

	  if ($data_text.selectedText) { comp_textLayer.deselectText() }
	  startUndoState({text_styles: loaded_text_styles}, `删除文本样式 ${$data_text.contextStyleId}`)

	  loaded_text_styles = loaded_text_styles.filter( (ts) => ts.id != $data_text.contextStyleId);
	  $data_text.contextStyleId = null;
	  $store_has_unsaved_changes = true;

	  completeUndoState({text_styles: loaded_text_styles})
	}

	export function applyTextStyles(styles: ListedTextStyle[]) {
	  $data_text.contextStyleId = null;
	  loaded_text_styles = styles
	}
</script>

<div
  class="panel"
  style={show ? "" : "display: none"}
  on:pointerdown={() => { if ($data_text.contextStyleId) $data_text.contextStyleId = null; }}
>
	<div id="controls">
		<section>
			<ColorInputPixi value={$data_text.style.fill} name="textFill" on:change={e => { changeTextStyle({fill: e.detail.string}) }} />

			<input id="fontSize" type="number" value={$data_text.style.fontSize} on:change={e => { changeTextStyle({fontSize: e.target.valueAsNumber}) }} />

			<div id="font-style-options">
				<div class="font-style-option">
				      <CustomValueToggle offValue={"normal"} onValue={"bold"} value={$data_text.style.fontWeight} on:change={e => changeTextStyle({fontWeight: e.detail.value})}>
					<b>B</b>
				      </CustomValueToggle>
				</div>

				<div class="font-style-option">
					<CustomValueToggle offValue={"normal"} onValue={"italic"} value={$data_text.style.fontStyle} on:change={e => changeTextStyle({fontStyle: e.detail.value})}>
					  <i style="font-family: 'Roboto Mono'">I</i>
					</CustomValueToggle>
				</div>
			</div>

			<SelectGrid
				options={[
					{ title: '左对齐', value: "left", filename: "textalignleft" },
					{ title: '居中对齐', value: "center", filename: "textaligncenter" },
					{ title: '右对齐', value: "right", filename: "textalignright" },
				]}
				value={$data_text.style.align}
				on:change={e => changeTextStyle({align: e.detail.value})}
			/>
		</section>

		<section>
		  <select id="textFont" value={$data_text.style.fontFamily} on:change={e => changeTextStyle({fontFamily: e.target.value})}>
		    {#each fonts as font}
		      <option value={font}>{font}</option>
		    {/each}
		  </select>
		</section>

		<section>
			<label for="textStroke">{'描边'}</label>
			<ColorInputPixi value={$data_text.style.stroke} on:change={e => changeTextStyle({stroke: e.detail.number})} id="textStroke" />
			<input type="number" min="0" step="1" bind:value={$data_text.style.strokeThickness} />
		</section>

		<section>
			<label for="text-alpha">{'不透明度'}</label>
			<input id="text-alpha" type="range" max="1" min="0.05" step="0.05" value={$data_text.style.alpha} on:input={e => changeTextStyle({alpha: e.target.valueAsNumber})} />
		</section>
	</div>

  {#if $data_text.selectedText}
    <div id="selected-text-controls">
      <div id="text-area-wrapper">
	<textarea
	  bind:value={$data_text.selectedText .text}
	  use:focus
	  bind:this={$data_text.editorRef}
	  on:change={() => { $store_has_unsaved_changes = true; }}
	/>
	<!-- The editor ref is literally jsut used to let us focus the text area by clicking on the text. -->
	<button on:click={() => { comp_textLayer.panelControl_deleteText( $data_text.selectedText) }} class="evil" >
	  {'删除选中的文本'}
	</button>
      </div>
    </div>
  {/if}

  <!-- TEXT STYLES -->
  <div id="text-styles" style={$data_text.selectedText ? "padding-top: 0" : ""} >
    <div style="display: flex; gap: 0.3125em; flex-wrap: wrap">
      {#each loaded_text_styles as ts (ts.id)}
	<button
	  on:click={() => { changeTextStyle(ts.style); }}
	  on:contextmenu={(e) => {
	    e.preventDefault();
	    menuX = e.clientX;
	    menuY = e.clientY;
	    $data_text.contextStyleId = ts.id;
	  }}
	  class:selected={selectedMatches( ts.style)}
	>
	  {ts.display}
	</button >
      {/each}

      <button class="green-button" style="width: 1.75em;" on:click={() => { newTextStyle(); }} title={'保存当前文本样式'} > + </button>
    </div>
  </div>
</div>

{#if $data_text.contextStyleId != null}
	<div class={"context-menu"} style={`top: ${menuY}px; left: ${menuX}px`}>
		<button
			on:click={updateListedStyleToMatch}
			title={'将当前样式更新为上方设置的样式'}
			>{'更新样式'}</button
		>
		<button on:click={renameStyle}
			>{'重命名'}</button
		>
		<button on:click={duplicateStyle}
			>{'复制'}</button
		>
		<button on:click={deleteStyle}
			>{'删除'}</button
		>
	</div>
{/if}

<style>
	.panel {
		color: var(--text);
	}

	#controls {
		padding: 1em;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}

	#controls section {
		display: flex;
		justify-content: flex-start;
		flex-direction: row;
		gap: 0.5em;
		width: 100%;
		flex-grow: 0;
		align-items: center;
		height: 2em;
	}

	#controls section select {
		width: 100%;
		height: 100%;
	}

	#controls section input[type="number"] {
		flex: 2 1 3.125em;
		width: 2em;
		height: 100%;
		border-radius: 0.5em;
		/* fix vertical sizing and alignment issues */
		margin-top: 0.125em;
		box-sizing: content-box;
	}

	#selected-text-controls {
		padding: 1em;
		background-color: var(--light-background);
	}

	#selected-text-controls #text-area-wrapper {
		position: relative;
		width: 100%;
		box-sizing: border-box;
		min-height: 3.75em;
	}

	#selected-text-controls textarea {
		box-sizing: border-box;
		min-height: 3.75em;
		max-width: 100%;
		min-width: 100%;
		height: 100%;
	}

	#selected-text-controls button {
		width: 100%;
		margin-top: 0.5em;
	}

	/* TEXT STYLES */
	#text-styles {
		padding: 0.5em;
		background-color: var(--light-background);
	}

	/* FONT STYLE */
	#font-style-options {
		display: flex;
		border-radius: var(--large-radius);
		overflow: hidden;
	}

	.font-style-option {
		width: 2em;
		height: 2em;
	}
</style>
