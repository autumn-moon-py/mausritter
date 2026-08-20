// 工具：骰子 / DOM 快捷 / 元素工厂
export const roll = s => Math.floor(Math.random() * s) + 1;
export const sum3 = () => roll(6) + roll(6) + roll(6);
export const sum6 = () => Array.from({ length: 6 }, () => roll(6)).sort((a, b) => a - b);
export const $ = id => document.getElementById(id);

// h('div', { class:'x', onclick:fn }, '文本' | [子节点...])
export function h(tag, attrs = {}, children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k in el && typeof v !== 'boolean') {
      try { el[k] = v; } catch { el.setAttribute(k, v); }
    } else {
      el.setAttribute(k, v);
    }
  }
  if (children == null) return el;
  if (Array.isArray(children)) children.forEach(c => c != null && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  else el.appendChild(typeof children === 'string' ? document.createTextNode(children) : children);
  return el;
}
