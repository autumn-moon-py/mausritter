<script lang="ts">
  import { completeUndoState, startUndoState } from "../lib"
    import { store_has_unsaved_changes } from "../stores/flags";

    export let loaded_save;

    function erase_all_icons() {
        if (!confirm('确定擦除所有图标？')) { return }
	startUndoState({icons: loaded_save.icons}, "擦除所有图标")
        loaded_save.icons = [];
        $store_has_unsaved_changes = true;
	completeUndoState({icons: loaded_save.icons})
    }

    function erase_all_paths() {
        if (!confirm('确定擦除所有路径？')) { return }
	startUndoState({paths: loaded_save.paths}, "擦除所有路径")
        loaded_save.paths = [];
        $store_has_unsaved_changes = true;
	completeUndoState({paths: loaded_save.paths})
    }

    function erase_all_text() {
        if (!confirm('确定擦除所有文本？')) { return }
	startUndoState({texts: loaded_save.texts}, "擦除所有文本")
        loaded_save.texts = [];
        $store_has_unsaved_changes = true;
	completeUndoState({texts: loaded_save.texts})
    }
</script>

<div class="panel panel-grid">
    <button class="outline-button" on:click={erase_all_icons} disabled={loaded_save.icons.length === 0}>
      {'擦除所有图标'}
    </button>
    <button class="outline-button" on:click={erase_all_paths} disabled={loaded_save.paths.length === 0}>
      {'擦除所有路径'}
    </button>
    <button class="outline-button" on:click={erase_all_text} disabled={loaded_save.texts.length === 0}>
      {'擦除所有文本'}
    </button>
</div>

<style>
    .panel {
        padding: 0.625em;
    }

    .panel-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 0.25em;
    }

    button {
        width: 100%;
    }
</style>

