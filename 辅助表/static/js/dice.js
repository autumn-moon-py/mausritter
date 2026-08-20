// 常用骰面：d4 / d6 / d8 / d10 / d12 / d20 / d100，以及 2d6
import { roll } from './util.js';

export function rollDie(sides, n = 1) {
  const dice = Array.from({ length: n }, () => roll(sides));
  const total = dice.reduce((a, b) => a + b, 0);
  return { dice, total, text: `${n}d${sides}=${dice.join('+')}=${total}` };
}

export const rollD4   = () => rollDie(4);
export const rollD6   = () => rollDie(6);
export const rollD8   = () => rollDie(8);
export const rollD10  = () => rollDie(10);
export const rollD12  = () => rollDie(12);
export const rollD20  = () => rollDie(20);
export const rollD100 = () => rollDie(100);
export const roll2d6  = () => rollDie(6, 2);

export const renderDie = r => `${r.text}`;
