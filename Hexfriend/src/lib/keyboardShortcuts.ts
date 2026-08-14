import type { shortcut_data } from '../types/inputs';
import { Tools } from '../types/toolData';

// Order must be control+shift+alt+{key in lower case}

export let shortcuts: shortcut_data[] = [
	// Keycodes that work anywhere
	// These will override tool specific commands
	{ keycode: 'control+s', function: 'save', tool: null, display: '保存当前地图' },
	{ keycode: 'control+z', function: 'undo', tool: null, display: '撤销' },
	{ keycode: 'control+shift+z', function: 'redo', tool: null, display: '重做' },

	// { keycode: 'control+z', function: 'undo', tool: null, display: 'Undo <wip>' },
	// { keycode: 'control+shift+z', function: 'redo', tool: null, display: 'Redo <wip>' },
	{ keycode: 'shift+m', function: 'toggleViewMaps', tool: null, display: '切换地图列表' },
	{ keycode: 'shift+s', function: 'toggleViewSettings', tool: null, display: '切换设置' },
	{ keycode: 'escape', function: 'backToMainView', tool: null, display: '返回主视图' },
	{ keycode: 'control+/', function: 'toggleShortcutList', tool: null, display: '查看快捷键列表' },
	{ keycode: 'shift+/', function: 'toggleControls', tool: null, display: '切换操作提示' },

	{ keycode: '1', function: 'changeTool_terrain', tool: null, display: '地形工具' },
	{ keycode: '2', function: 'changeTool_icon', tool: null, display: '图标工具' },
	{ keycode: '3', function: 'changeTool_path', tool: null, display: '路径工具' },
	{ keycode: '4', function: 'changeTool_text', tool: null, display: '文本工具' },
	{ keycode: '5', function: 'changeTool_eraser', tool: null, display: '橡皮擦工具' },
	{ keycode: '6', function: 'changeTool_overlay', tool: null, display: '覆盖图工具' },

	{ keycode: 'control+q', function: 'toggle_overlay', tool: null, display: '切换覆盖图可见性' },

	// TERRAIN
	{ keycode: 'e', function: 'toggleEraser', tool: Tools.TERRAIN, display: '切换橡皮擦' },
	{ keycode: 'p', function: 'togglePaintbucket', tool: Tools.TERRAIN, display: '切换填充桶' },

	{ keycode: 'shift', function: null, tool: Tools.TERRAIN, display: '擦除', displayKeycode: 'Shift（按住）' },
	{ keycode: 'control', function: null, tool: Tools.TERRAIN, display: '填充桶', displayKeycode: 'Ctrl（按住）' },
	{ keycode: 'alt', function: null, tool: Tools.TERRAIN, display: '取色器', displayKeycode: 'Alt（按住）' },

	// ICONs
	{ keycode: 's', function: 'toggleSnap', tool: Tools.ICON, display: '切换吸附' },
	{ keycode: 'control', function: 'toggleDragMode', tool: Tools.ICON, display: '拖动图标', displayKeycode: 'Ctrl（按住）' },

	// PATH
	{ keycode: 's', function: 'toggleSnap', tool: Tools.PATH, display: '切换吸附' },
	{ keycode: 'delete', function: 'deletePath', tool: Tools.PATH, display: '删除选中的路径' },
	{ keycode: 'backspace', function: 'deleteLastPoint', tool: Tools.PATH, display: '删除最新路径点' },
	{ keycode: 'control+d', function: 'deselect', tool: Tools.PATH, display: '取消选择路径' },

	{ keycode: 'shift', function: null, tool: Tools.PATH, display: '忽略路径', displayKeycode: 'Shift（按住）' },

	// TEXT
	{ keycode: 'control+b', function: 'toggleBold', tool: Tools.TEXT, display: '切换粗体' },
	{ keycode: 'control+i', function: 'toggleItalics', tool: Tools.TEXT, display: '切换斜体' },
	{ keycode: 'control+delete', function: 'deleteText', tool: Tools.TEXT, display: '删除选中的文本' },

	// ERASER
	{ keycode: 'shift', function: null, tool: Tools.ERASER, display: '仅擦除地形', displayKeycode: 'Shift（按住）' },
	{ keycode: 'control', function: null, tool: Tools.ERASER, display: '仅擦除图标', displayKeycode: 'Ctrl（按住）' },

	// OVERLAY
];

export function getKeyboardShortcut(keyCode: string, $store_selected_tool: Tools) {
	return shortcuts.find((shortcut: shortcut_data) => shortcut.keycode == keyCode && (shortcut.tool == $store_selected_tool || shortcut.tool == null));
}

export default { getKeyboardShortcut };
