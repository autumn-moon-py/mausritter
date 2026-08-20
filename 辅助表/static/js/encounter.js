// 探索轮与遭遇检定（地下城/荒野）
import { roll, $, h } from './util.js';
import { getTable } from './encounter-table.js';

let turn = 0;

const updateEncHint = () => {
  $('enc-hint').style.display = (turn > 0 && turn % 3 === 0) ? 'block' : 'none';
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
};

// 触发展示区
function showEncounter(outEl, kind) {
  const t = getTable();
  const r = roll(6);
  outEl.style.display = 'inline-block';
  if (t) {
    outEl.textContent = `遭遇 #${r}：${t[r] || '（该条目未导入）'}`;
    outEl.classList.add('enc-detail');
  } else {
    outEl.textContent = `遭遇 #${r}`;
    outEl.classList.remove('enc-detail');
  }
}

export function rollDungeon() {
  const r = roll(6);
  $('dun').textContent = `${r} · ${r <= 2 ? '遭遇' : '无事'}`;
  if (r <= 2) showEncounter($('dun-enc'), 'dun'); else $('dun-enc').style.display = 'none';
}

export function rollWild() {
  const r = roll(6);
  $('wild').textContent = `${r} · ${r <= 2 ? '遭遇' : '无事'}`;
  if (r <= 2) showEncounter($('wild-enc'), 'wild'); else $('wild-enc').style.display = 'none';
}

export const rollHour = () => { $('hour').textContent = `${roll(12)} 时`; };
