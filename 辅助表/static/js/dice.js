// 常用骰面：d3 / d4 / d6 / d8 / d10 / d12，以及 2d6 / 3d6
import { roll } from './util.js';

export function rollDie(sides, n = 1) {
  const dice = Array.from({ length: n }, () => roll(sides));
  const total = dice.reduce((a, b) => a + b, 0);
  // 单骰只显示 NdS=N；多骰显示 NdS=a+b+...=total
  const text = n === 1 ? `${n}d${sides}=${total}` : `${n}d${sides}=${dice.join('+')}=${total}`;
  return { dice, total, text };
}

export const rollD3  = () => rollDie(3);
export const rollD4  = () => rollDie(4);
export const rollD6  = () => rollDie(6);
export const rollD8  = () => rollDie(8);
export const rollD10 = () => rollDie(10);
export const rollD12 = () => rollDie(12);
export const roll2d6 = () => rollDie(6, 2);
export const roll3d6 = () => rollDie(6, 3);

export const renderDie = r => `${r.text}`;
