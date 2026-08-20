// 施法：掷 WIL 颗 d6，统计 [DICE]=3+ 数；掷出 1 且总值 < WIL 则失控
import { roll, $ } from './util.js';

export function rollCast() {
  const wil = parseInt($('cast').value) || 9;
  const dice = Array.from({ length: wil }, () => roll(6));
  const diceNum = dice.filter(d => d >= 3).length;
  const total = dice.reduce((a, b) => a + b, 0);
  const lost = dice.includes(1) && total < wil;
  $('cast-out').textContent = `${diceNum} dice`;
  $('cast-detail').innerHTML = lost
    ? `<span class="fail">失控！施法失败</span> · 掷 ${wil} 颗 d6：${dice.join(' ')} → [DICE]=${diceNum}`
    : `掷 ${wil} 颗 d6：${dice.join(' ')} → [DICE]=${diceNum}`;
}

export function castReset() {
  $('cast-out').textContent = '-';
  $('cast-detail').textContent = '输入 WIL 后掷骰，统计 3+ 的骰子数';
}
