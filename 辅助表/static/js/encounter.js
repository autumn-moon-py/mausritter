// 探索轮与遭遇检定（地下城）
import { roll, $, h } from './util.js';
import { getTable } from './encounter-table.js';

let turn = 0;

const updateEncHint = () => {
  const el = $('enc-trigger');
  if (!el) return;
  const active = turn > 0 && turn % 3 === 0;
  el.style.color = active ? '#c62828' : '';
  el.style.fontWeight = active ? '700' : '';
};

export const turnAdd = n => {
  turn = Math.max(0, turn + n);
  $('turn').textContent = turn;
  updateEncHint();
};
export const turnReset = () => {
  turn = 0;
  $('turn').textContent = '0';
  updateEncHint();
  // 重置遭遇检定的两个结果
  const dun = $('dun'); if (dun) dun.textContent = '-';
  const dunEnc = $('dun-enc'); if (dunEnc) { dunEnc.style.display = 'none'; dunEnc.textContent = '-'; }
  // 重置守望为 2（早上）
  const w = document.getElementById('watch');
  if (w) {
    w.value = 2;
    w.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

// 触发展示区
function showEncounter(outEl, kind) {
  const t = getTable();
  const r = roll(6);
  outEl.style.display = 'inline-block';
  if (t) {
    outEl.textContent = `遭遇-${r}：${t[r] || '（该条目未导入）'}`;
    outEl.classList.add('enc-detail');
  } else {
    outEl.textContent = `遭遇-${r}`;
    outEl.classList.remove('enc-detail');
  }
}

export function rollDungeon() {
  const r = roll(6);
  $('dun').textContent = `${r} · ${r <= 2 ? '遭遇' : '无事'}`;
  if (r <= 2) showEncounter($('dun-enc'), 'dun'); else $('dun-enc').style.display = 'none';
}
