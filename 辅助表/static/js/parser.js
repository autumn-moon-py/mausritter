// 解析器：HP 角色块 / 遭遇表 markdown
// 角色块支持：
//   1) ## 角色名 + ```围栏```
//   2) ## 角色名 + 裸 HP 段（标题行后立即接段，无空行也认）
//   3) 裸 HP 段（无标题）→ 自动编号（按空行分组）

const HP_LINE = /^\s*HP\s+(\d+)\s*\/\s*(\d+)\s+STR\s+(\d+)\s+DEX\s+(\d+)\s+WIL\s+(\d+)\s*$/i;

function stripFence(s) {
  let out = s.replace(/^[ \t]*```[^\n]*\n/, '');
  out = out.replace(/\n[ \t]*```[ \t]*$/, '');
  return out;
}

export function parseStatBlocks(text) {
  if (!text) return [];
  const list = [];
  let anonN = 0;

  // ---- 1. ## + 围栏 ----
  const fencedRe = /(^|\n)##\s*([^\n#][^\n]*)[ \t]*\n(?:[ \t]*\n)*[ \t]*```[^\n]*\n([\s\S]*?)\n[ \t]*```[ \t]*(?=\n|$)/g;
  let m;
  while ((m = fencedRe.exec(text)) !== null) {
    const name = m[2].trim();
    const body = stripFence(m[3]);
    const item = parseOneBlock(name, body);
    if (item) list.push(item);
  }

  // ---- 2. 裸 / 标题-裸：按行扫描，遇 ## 立刻结束上段并开新段 ----
  const raw = text.replace(/```[\s\S]*?```/g, '\n').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');
  const titleRe = /^[ \t]*##[ \t]*(\S[^\n]*?)[ \t]*$/;
  const groups = []; // {title, lines:[]}
  let cur = { title: '', lines: [] };
  for (const ln of lines) {
    if (titleRe.test(ln.trim())) {
      if (cur.title || cur.lines.length) groups.push(cur);
      const name = ln.trim().replace(titleRe, '$1').trim();
      cur = { title: name, lines: [] };
    } else {
      cur.lines.push(ln);
    }
  }
  if (cur.title || cur.lines.length) groups.push(cur);

  for (const g of groups) {
    // 去掉空行分隔
    const paras = g.lines.join('\n').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    for (const p of paras) {
      const ll = p.split(/\n/).map(s => s.trim()).filter(Boolean);
      if (!ll.length || !HP_LINE.test(ll[0])) continue;
      const item = parseOneBlock(g.title, p);
      if (item) list.push(item);
    }
  }

  // 空名兜底 + 去重
  const seen = new Set();
  const out = [];
  for (const it of list) {
    if (!it.name) it.name = `未命名-${++anonN}`;
    const k = `${it.name}|${it.hpMax}|${it.str}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function parseOneBlock(name, body) {
  const lines = body.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) return null;
  const hit = HP_LINE.exec(lines[0]);
  if (!hit) return null;
  const [, hpCur, hpMax, str, dex, wil] = hit;
  return {
    name: (name || '').trim(),
    hpCur: +hpCur,
    hpMax: +hpMax,
    str: +str,
    dex: +dex,
    wil: +wil,
    extra: lines.slice(1),
  };
}

export function parseEncounterTable(text) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  let header = false, sep = false;
  const rows = [];
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = splitRow(line);
    if (!header) {
      if (cells[0] && /^d\d+$/i.test(cells[0])) { header = true; continue; }
    } else if (!sep) {
      if (cells.every(c => /^:?-+:?$/.test(c))) { sep = true; continue; }
    } else {
      const n = parseInt(cells[0], 10);
      const txt = (cells[1] || '').trim();
      if (Number.isFinite(n) && txt) rows.push([n, txt]);
    }
  }
  if (!sep) return null;
  const map = {};
  rows.forEach(([n, t]) => { map[n] = t; });
  return Object.keys(map).length ? map : null;
}

function splitRow(line) {
  return line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim());
}
