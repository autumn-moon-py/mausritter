// 主入口：聚合各模块，将 HTML 内联 onclick 调用的函数挂到 window。
import * as Enc from './encounter.js';
import * as Save from './save.js';
import * as Cast from './casting.js';
import * as Dice from './dice.js';
import * as EncTable from './encounter-table.js';
import * as Combat from './combat.js';
import { initMemo } from './memo.js';

// 探索轮
window.turnAdd   = Enc.turnAdd;
window.turnReset = Enc.turnReset;

// 遭遇
window.rollDungeon = Enc.rollDungeon;
window.rollWild    = Enc.rollWild;
window.rollHour    = Enc.rollHour;

// 遭遇表
window.importEncounterTable    = EncTable.importEncounterTable;
window.clearEncounterTable     = EncTable.clearEncounterTable;
window.loadSampleEncounterTable= EncTable.loadSampleEncounterTable;

// 豁免
window.rollSave = Save.rollSave;
window.judge    = Save.judge;
window.rollLuck = Save.rollLuck;

// 施法
window.rollCast   = Cast.rollCast;
window.castReset  = Cast.castReset;

// 常用骰面
window.rollD4   = () => showDice(Dice.rollD4());
window.rollD6   = () => showDice(Dice.rollD6());
window.rollD8   = () => showDice(Dice.rollD8());
window.rollD10  = () => showDice(Dice.rollD10());
window.rollD12  = () => showDice(Dice.rollD12());
window.rollD20  = () => showDice(Dice.rollD20());
window.rollD100 = () => showDice(Dice.rollD100());
window.roll2d6  = () => showDice(Dice.roll2d6());
window.rollCustom = () => {
  const s = parseInt(document.getElementById('dice-sides').value);
  const n = parseInt(document.getElementById('dice-count').value);
  if (!Number.isFinite(s) || s < 2) return;
  showDice(Dice.rollDie(s, Number.isFinite(n) && n > 0 ? n : 1));
};

function showDice(r) {
  const el = document.getElementById('dice-last');
  if (el) el.textContent = `${r.text}（${r.dice.join(' + ')}）`;
}

// 战斗数据
window.importCombatFromTextarea = Combat.importCombatFromTextarea;
window.loadSampleCombat         = Combat.loadSampleCombat;

// 备忘录
window.initMemo = initMemo;
document.addEventListener('DOMContentLoaded', initMemo);
