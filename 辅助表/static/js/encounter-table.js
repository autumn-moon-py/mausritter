// 遭遇表存储与解析
import { $, h } from './util.js';
import { parseEncounterTable } from './parser.js';

/** @type {{[k:number]:string} | null} */
let table = null;
// 使用事件订阅，便于 encounter.js 在遭遇时主动查询（避免模块互相 import 引发循环）
const subscribers = new Set();

export function getTable() { return table; }

export function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
function notify() { subscribers.forEach(fn => fn(table)); }

export function importEncounterTable() {
  const ta = $('enc-table-input');
  if (!ta) return;
  const t = parseEncounterTable(ta.value);
  if (!t) { alert('未识别到遭遇表，请使用 markdown 表格 (| d6 | 遭遇 |)'); return; }
  table = t;
  $('enc-table-status').textContent = `已导入 ${Object.keys(t).length} 条`;
  notify();
  renderPreview();
}

export function clearEncounterTable() {
  table = null;
  $('enc-table-status').textContent = '未导入，使用默认随机条目';
  notify();
  renderPreview();
}

export function loadSampleEncounterTable() {
  const sample = `| d6 | 遭遇 |
| --- | --- |
| 1 | 2只鼠帮成员正蹲在墙根分一串干蘑菇,嘴上还在为谁来领头拌嘴 |
| 2 | 1只鼠帮成员举着一块发绿的碎石头朝同伴显摆,说是从地板下刨出来的 |
| 3 | 1只鼠帮成员蹲在墙角用爪子在蜡墙上刮方向标记,每刮一笔都要回头张望 |
| 4 | 一只半透明的鼠形身影在过道尽头一动不动地盯着你看,银光从胸腔里透出来 |
| 5 | 银线从天花板垂下,轻轻缠在一只死鼠帮成员的脖子上,线还在自己打颤 |
| 6 | 物质领域的墙皮突然剥落又长回来,木色在黄褐与冷蓝之间切换了一瞬 |
`;
  const ta = $('enc-table-input');
  if (ta) { ta.value = sample; importEncounterTable(); }
}

function renderPreview() {
  const el = $('enc-table-preview');
  if (!el) return;
  el.innerHTML = '';
  if (!table) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  Object.entries(table).sort((a, b) => +a[0] - +b[0]).forEach(([k, v]) => {
    el.appendChild(h('div', { class: 'row', style: 'margin-bottom:2px' }, [
      h('span', { class: 'out', style: 'min-width:28px;padding:2px 6px;font-size:.8rem' }, k),
      h('span', { class: 'note', style: 'flex:1;min-width:0' }, v),
    ]));
  });
}
