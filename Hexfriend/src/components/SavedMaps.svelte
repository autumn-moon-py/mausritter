<script lang="ts">
  import { db } from '../lib/db'
  import { download } from '../lib/download2'
  import { convertSaveDataToLatest } from '../lib/saveDataConverter'
  import { store_has_unsaved_changes } from '../stores/flags'
  import { LATESTSAVEDATAVERSION } from '../types/savedata'
  import { liveQuery } from 'dexie'

  let saves = liveQuery(() => db.mapSaves.toArray())

  // TODO the outline on the maps is really ugly cos it gets hidden by a box

  export let showSavedMaps: boolean
  export let load: Function
  export let save_map: Function

  export let createNewMap: Function

  async function clickedMap(id: number) {
    if ($store_has_unsaved_changes) {
      // Doesn't actually work because has_unsaved_changes is updated too often lol
      let confirm = window.confirm('这将丢弃你当前加载的地图——确定吗？')
      if (!confirm) return
    }

    showSavedMaps = false

    let mapString = (await db.mapStrings.get(id)).mapString

    let mapData = JSON.parse(mapString)

    load(mapData, id)
  }

  function deleteMap(id: number) {
    if (!confirm('确定要删除吗？')) return

    db.mapSaves.delete(id)
    db.mapStrings.delete(id)
  }

  async function exportAsHexfriend(id: number) {
    let mapData = JSON.parse((await db.mapStrings.get(id)).mapString)

    download(
      JSON.stringify(mapData),
      `${mapData.title ? mapData.title : '未命名 Hexfriend'}.hexfriend`,
      'appliation/json',
    )
  }

  async function duplicateMap(id: number) {
    let mapData = JSON.parse((await db.mapStrings.get(id)).mapString)

    let title = prompt('地图标题：', `${mapData.title} ${'的副本'}`)
    if (title == null) return

    mapData.title = title

    const preview = (await db.mapSaves.get(id)).previewBase64

    //loadAndSave(mapData)
    // Saving with null forces a new save + updates to current map
    save_map(mapData, null, preview).then((new_id) => {})
  }
</script>

<main class:shown={showSavedMaps}>
  <button
    id="close-button"
    on:click={() => {
      showSavedMaps = false
    }}
  >
    <img src="/assets/img/ui/back.png" alt={'关闭地图列表'} />
  </button>

  <div id="maps-grid-container">
    <h1 class="title">{'地图'}</h1>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      id="save-map-button"
      on:click={() => {
        createNewMap()
        showSavedMaps = false
      }}
    >
      <img src="/assets/img/ui/new.svg" alt={'新建地图'} />
      <p>{'新建地图'}</p>
    </div>

    <div id="maps-container">
      <div id="maps">
        {#if $saves}
          {#each $saves as save (save.id)}
            <div class="map-save" class:error={save.saveVersion != LATESTSAVEDATAVERSION}>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div
                on:click={() => {
                  clickedMap(save.id)
                }}
              >
                <div class="image-container">
                  <img src={save.previewBase64} alt={'地图预览'} />
                </div>

                <p>{save.mapTitle}</p>
              </div>

              {#if save.saveVersion != LATESTSAVEDATAVERSION}
                <div
                  class="error-notification"
                  title={'这份存档数据是旧版本——保存时将自动更新。'}
                >
                  {'旧版本！'}
                </div>
              {/if}

              <div class="buttons">
                <button
                  on:click={() => {
                    deleteMap(save.id)
                  }}
                >
                  <img src="/assets/img/tools/trash.png" alt={'删除地图'} />
                </button>

                <button
                  on:click={() => {
                    exportAsHexfriend(save.id)
                  }}
                  title={'快速导出'}
                >
                  <img src="/assets/img/ui/quick export.png" alt={'导出'} />
                </button>

                <button
                  on:click={() => {
                    duplicateMap(save.id)
                  }}
                  title={'复制'}
                >
                  <img src="/assets/img/ui/duplicate.png" alt={'复制'} />
                </button>
              </div>
            </div>
          {/each}
        {:else}
          <p id="loading-text">{'加载中...'}</p>
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  main {
    position: absolute;
    top: 0;
    left: -22em;
    width: 19em;
    height: 100%;
    transition-duration: 0.2s;
  }

  main.shown {
    left: 0em;
    transition-duration: 0.2s;
  }

  #maps-grid-container {
    width: 100%;
    padding: 1em;
    padding-bottom: 0;
    max-height: 100%;
    background-color: var(--primary-background);
    display: flex;
    gap: 1em;
    flex-direction: column;
    box-sizing: border-box;
    overflow-y: hidden;
  }

  .title {
    margin: 0;
    font-weight: normal;
  }

  #save-map-button {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 3em;
    justify-content: center;
    align-items: center;
    border-radius: var(--small-radius);

    margin: 0;
    padding: 0;
    transition-duration: 0.1s;
    border: solid 1px var(--lighter-background);

    cursor: pointer;
  }

  #save-map-button:hover {
    transition-duration: 0.1s;
    transition-timing-function: cubic-bezier(0.075, 0.82, 0.165, 1);
    background-color: var(--light-background);
  }

  #save-map-button:active {
    background-color: var(--lighter-background);
  }

  #save-map-button img {
    /* don't touch - highly calibrated */
    height: calc(2em + 0%);
  }

  #save-map-button p {
    font-size: 2em;
    opacity: 0.6;
    font-size: 18pt;
  }

  #maps-container {
    overflow-y: scroll;
    margin-bottom: 0;
    padding-bottom: 1em;
  }

  #maps {
    width: 100%;
    height: auto;
    background: var(--primary-background);

    /* leave space for map hover border effects */
    box-sizing: border-box;
    padding: 2px;

    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: auto;
    gap: 0.5em;
    row-gap: 0.5em;
  }

  .map-save {
    position: relative;
    overflow: hidden;
    border-radius: 0.5em;
    cursor: pointer;
    height: 8.25em;
    aspect-ratio: 1/1;
  }

  #loading-text {
    width: 100%;
    height: 100%;
  }

  .map-save p {
    position: absolute;
    bottom: 0;
    text-align: center;
    margin: 0;
    padding: 0.3125em;
    background-color: var(--primary-background);
    opacity: 0.75;
    width: 100%;
    box-sizing: border-box;
  }

  div {
    width: 100%;
    height: 100%;
  }

  .map-save.error {
    outline: yellow 1px solid;
  }

  .map-save .error-notification {
    position: absolute;
    top: 0.5em;
    left: 0.5em;
    right: 0.5em;
    color: yellow;
    width: auto;
    height: 25px;
    border: solid 1px yellow;
    border-radius: 0.5em;
    background-color: var(--primary-background);
    display: flex;
    justify-content: center;
    align-items: center;

    transition: top 0.15s ease-in-out;
  }

  .map-save:hover .error-notification {
    top: calc(0.5em + 25px + 0.5em);
  }

  #close-button {
    position: absolute;

    left: -2.5em;
    top: 0;

    width: 2.5em;
    height: 8em;
    border-radius: 0em;
    border-top-right-radius: 0.5em;
    border-bottom-right-radius: 0.5em;
    border: none;
    background: var(--primary-background);
    transition-duration: 0.2s;
    transition-timing-function: ease;
    padding: 0.5em;
    box-sizing: border-box;
  }

  #close-button {
    left: 22.75em;
  }

  #close-button img {
    margin: 0;
    width: 100%;
  }

  #close-button:hover {
    background: var(--light-background);
  }

  .buttons {
    position: absolute;
    top: -2em;
    left: 0.5em;
    right: 0.5em;
    width: auto;
    height: 2em;
    display: flex;
    justify-content: space-around;
    gap: 0.5em;

    transition: top 0.15s ease-in-out;
  }

  .buttons button {
    width: 2em;
    height: 2em;
    padding: 0;

    justify-content: center;
    align-items: center;
  }

  .buttons button img {
    width: 70%;
  }

  .map-save:hover .buttons {
    top: 0.5em;
  }

  .map-save:hover {
    background-color: var(--light-background);
    outline: solid 0.125em var(--hexfriend-green);
  }

  .image-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #000000;
  }

  .image-container img {
    width: 150%;
  }
</style>
