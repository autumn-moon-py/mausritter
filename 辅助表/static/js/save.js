// 豁免 + 幸运骰
import { roll, sum3, sum6, $ } from './util.js';

export function rollSave() {
  const mode = document.querySelector('input[name="adv"]:checked').value;
  let t;
  if (mode === 'normal') t = sum3();
  else {
    const d = sum6();
    t = mode === 'adv'
      ? d.slice(0, 3).reduce((a, b) => a + b, 0)
      : d.slice(3).reduce((a, b) => a + b, 0);
  }
  $('save').textContent = t;
  judge();
}

export function judge() {
  const stat = parseInt($('stat').value) || 9;
  const n = parseInt($('save').textContent);
  const el = $('save-judge');
  if (isNaN(n)) {
    el.textContent = '3d6 ≤ 属性则成功';
    el.className = 'note';
    return;
  }
  if (n <= stat) {
    el.textContent = `成功（${n}≤${stat}）`;
    el.className = 'note succ';
  } else {
    el.textContent = `失败（${n}>${stat}）`;
    el.className = 'note fail';
  }
}

export function rollLuck() {
  const x = parseInt($('luckx').value) || 3;
  const r = roll(6);
  $('luck').textContent = `${r} · ${r <= x ? '发生' : '未发生'}`;
}
