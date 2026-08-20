// 战斗数据：候选池（基准） + 战斗区（可堆叠同名实例）
// 命名规则：基准名 = 候选池里的 name
//   首次加入战斗 → 显示 "基准名"
//   再加入同名   → 显示 "基准名-2"、"-3"…
// 每次加入都生成新实例（深拷贝），相互独立调整 HP / 属性

import { $, h } from './util.js';
import { parseStatBlocks } from './parser.js';

let nextId = 1;
const uid = () => `c${Date.now().toString(36)}${nextId++}`;

/** @type {Map<string,{id:string,name:string,baseName:string,hpCur:number,hpMax:number,str:number,dex:number,wil:number,extra:string[],note:string,candId:string}>} */
const active = new Map();
const order = []; // 战斗区实例的展示顺序

// ----------- 候选池 -----------
/**
 * 解析得到 / 重新渲染候选池。
 * candidates 是 Map<id, {...}>，键为稳定 id。
 */
const candidates = new Map(); // candId -> {id,name,hpCur,hpMax,str,dex,wil,extra}
function renderCandidateList() {
  const el = $('cand-list');
  if (!el) return;
  el.innerHTML = '';
  if (candidates.size === 0) {
    el.innerHTML = `<div class="hint" style="padding:6px">尚未导入，先在下方粘贴角色数据，然后「解析」。</div>`;
    return;
  }
  candidates.forEach(c => {
    const used = countByBase(c.name);
    const row = h('div', { class: 'cand-row' });
    row.appendChild(h('span', { class: 'cand-name' }, c.name));
    row.appendChild(h('span', { class: 'cand-stat' }, `HP ${c.hpCur}/${c.hpMax} · STR ${c.str} DEX ${c.dex} WIL ${c.wil}`));
    if (used > 0) row.appendChild(h('span', { class: 'hint', style: 'color:#c62828' }, `已加 ${used}`));
    row.appendChild(h('button', { class: 'btn ghost', onclick: () => addToCombat(c.id) }, '加入战斗'));
    row.appendChild(h('button', { class: 'btn ghost', onclick: () => removeCandidate(c.id) }, '×'));
    el.appendChild(row);
  });
}

function countByBase(baseName) {
  let n = 0;
  for (const it of active.values()) if (it.baseName === baseName) n++;
  return n;
}

function removeCandidate(id) {
  if (candidates.delete(id)) renderCandidateList();
}

// ----------- 战斗区 -----------
function renderCombatList() {
  const el = $('combat-list');
  if (!el) return;
  el.innerHTML = '';
  if (order.length === 0) {
    el.innerHTML = `<div class="hint" style="padding:6px">战斗区为空，点候选区的「加入战斗」即可。</div>`;
    return;
  }
  order.forEach(id => {
    const c = active.get(id);
    if (c) el.appendChild(buildCombatCard(c));
  });
}

/** 对一个基准名生成下一个可用实例名：`基准名` → `基准名-2` → `基准名-3` … */
function nextInstanceName(baseName) {
  const used = countByBase(baseName);
  if (used === 0) return baseName;
  // 已存在 baseName(used=1)、baseName-2…baseName-used 时，下一个是 baseName-(used+1)
  return `${baseName}-${used + 1}`;
}

function addToCombat(candId) {
  const cand = candidates.get(candId);
  if (!cand) return;
  const id = uid();
  const instance = {
    id,
    candId,
    baseName: cand.name,
    name: nextInstanceName(cand.name),
    hpCur: cand.hpCur,
    hpMax: cand.hpMax,
    str: cand.str,
    dex: cand.dex,
    wil: cand.wil,
    extra: [...cand.extra],
    note: '',
  };
  active.set(id, instance);
  order.push(id);
  renderCandidateList(); // 同步刷新"已加 N"
  renderCombatList();
}

function removeFromCombat(id) {
  if (active.delete(id)) {
    const i = order.indexOf(id);
    if (i >= 0) order.splice(i, 1);
    renderCandidateList(); // "已加 N" 减少
    renderCombatList();
  }
}

// 调节器（HP / 属性通用）
function buildAdjuster(c, key, label, min, max) {
  const wrap = h('div', { class: 'adjuster' });
  wrap.appendChild(h('span', { class: 'note', style: 'min-width:auto;flex:0' }, label));
  const valInp = h('input', { type: 'number', value: c[key], class: 'adj-val' });
  const mirror = h('span', { class: 'out adj-mirror' }, String(c[key]));
  const stepInp = h('input', { type: 'number', value: 1, min: 1, max: 99, class: 'adj-step' });
  const minus = h('button', { class: 'btn ghost', onclick: () => step(c, key, -readStep(stepInp), min, max, mirror) }, '−');
  const plus  = h('button', { class: 'btn ghost', onclick: () => step(c, key, +readStep(stepInp), min, max, mirror) }, '+');
  valInp.addEventListener('change', () => {
    const v = clamp(+valInp.value, min, max);
    c[key] = v;
    mirror.textContent = String(c[key]);
    valInp.value = c[key];
  });
  wrap.appendChild(minus);
  wrap.appendChild(stepInp);
  wrap.appendChild(plus);
  wrap.appendChild(valInp);
  wrap.appendChild(mirror);
  return wrap;
}

function readStep(el) { return Math.max(1, +el.value || 1); }
function step(c, key, delta, min, max, mirror) {
  c[key] = clamp(c[key] + delta, min, max);
  const card = mirror.closest('.combat-card');
  if (card) {
    const inp = card.querySelector(`input[data-key="${key}"]`);
    if (inp) inp.value = c[key];
  }
  mirror.textContent = String(c[key]);
}
function clamp(v, lo, hi) {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

function buildCombatCard(c) {
  const card = h('div', { class: 'combat-card' });
  card.dataset.id = c.id;

  // 标题行
  const head = h('div', { class: 'combat-head' });
  head.appendChild(h('input', {
    type: 'text', value: c.name, class: 'combat-name',
    oninput: e => { c.name = e.target.value; },
  }));
  head.appendChild(h('span', { class: 'hint', style: 'color:#888' }, c.baseName));
  head.appendChild(h('button', { class: 'btn ghost', onclick: () => removeFromCombat(c.id) }, '移除'));
  card.appendChild(head);

  // HP
  const hpBlock = h('div', { class: 'stat-block' });
  hpBlock.appendChild(h('div', { class: 'stat-label' }, 'HP'));
  hpBlock.appendChild(buildAdjuster(c, 'hpCur', '当前', 0, 99));
  hpBlock.appendChild(buildAdjuster(c, 'hpMax', '上限', 1, 99));
  card.appendChild(hpBlock);

  // 属性
  const statBlock = h('div', { class: 'stat-block' });
  statBlock.appendChild(h('div', { class: 'stat-label' }, '属性'));
  ['str', 'dex', 'wil'].forEach(k => statBlock.appendChild(buildAdjuster(c, k, k.toUpperCase(), 0, 18)));
  card.appendChild(statBlock);

  // data-key 标注（供 step() 反查）
  [...hpBlock.querySelectorAll('input.adj-val'), ...statBlock.querySelectorAll('input.adj-val')].forEach(inp => {
    const lbl = inp.parentElement.querySelector('.note');
    const map = { '当前': 'hpCur', '上限': 'hpMax', 'STR': 'str', 'DEX': 'dex', 'WIL': 'wil' };
    const k = map[lbl.textContent];
    if (k) inp.dataset.key = k;
  });

  // 原始数据
  if (c.extra && c.extra.length) {
    const toggle = h('button', { class: 'btn ghost', onclick: () => toggleExtra(c.id) }, '▸ 原始数据');
    const preWrap = h('div', { class: 'combat-extra', id: `extra-${c.id}`, style: 'display:none' });
    preWrap.appendChild(h('pre', {
      class: 'rule',
      style: 'white-space:pre-wrap;margin:0;font-family:ui-monospace,Menlo,monospace;font-size:.78rem',
    }, [`HP ${c.hpCur}/${c.hpMax} STR ${c.str} DEX ${c.dex} WIL ${c.wil}`, ...c.extra].join('\n')));
    card.appendChild(toggle);
    card.appendChild(preWrap);
  }

  // 备注
  const noteRow = h('div', { class: 'row', style: 'flex-direction:column;align-items:stretch' });
  noteRow.appendChild(h('span', { class: 'note', style: 'min-width:auto' }, '备注 / 状态'));
  noteRow.appendChild(h('textarea', { class: 'combat-note', rows: 2, oninput: e => { c.note = e.target.value; } }, c.note || ''));
  card.appendChild(noteRow);

  return card;
}

function toggleExtra(id) {
  const el = $('extra-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ----------- 公开入口 -----------
export function importCombatFromTextarea() {
  const ta = $('combat-input');
  if (!ta) return;
  const blocks = parseStatBlocks(ta.value);
  if (!blocks.length) {
    alert('未识别到角色数据，请确认首行形如「HP 3/3 STR 12 DEX 8 WIL 8」');
    return;
  }
  blocks.forEach(b => {
    // 同名+同hpMax+同str 视为同一基准，不重复添加
    const exists = [...candidates.values()].some(c => c.name === b.name && c.hpMax === b.hpMax && c.str === b.str);
    if (!exists) candidates.set(uid(), { ...b });
  });
  renderCandidateList();
  ta.value = '';
}

export function loadSampleCombat() {
  const sample = `## 鼠帮成员
\`\`\`
HP 3/3 STR 12 DEX 8 WIL 8
攻击：d6 切肉刀
欲望：找到失踪的同伙,活着离开
\`\`\`

## 老钳
\`\`\`
HP 5/5 STR 14 DEX 10 WIL 10
攻击：d8 铁钩
重击：目标倒地并恐惧
欲望：把弟兄们带回家
\`\`\`

## 守卫灵
\`\`\`
HP 9/9 STR 5 DEX 10 WIL 12
攻击：d8 阴寒触碰（伤害WIL）
重击：附身目标,目标下回合攻击同伴
欲望：守护女王的安眠不被侵扰
备注：仅可被银武/驱灵/魔法伤害
\`\`\`
`;
  const ta = $('combat-input');
  if (ta) { ta.value = sample; importCombatFromTextarea(); }
}
