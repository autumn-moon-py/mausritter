// 备忘录：多行文本自动保存到 localStorage
import { $ } from './util.js';

const KEY = 'cheatsheet.memo';

export function initMemo() {
  const ta = $('memo');
  if (!ta) return;
  ta.value = localStorage.getItem(KEY) || '';
  let saveTimer;
  ta.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(KEY, ta.value);
      const st = $('memo-status');
      if (st) { st.textContent = '已自动保存'; clearTimeout(st._t); st._t = setTimeout(() => st.textContent = '', 1200); }
    }, 400);
  });
  $('memo-clear')?.addEventListener('click', () => {
    if (!confirm('清空备忘录？')) return;
    ta.value = '';
    localStorage.removeItem(KEY);
  });
  $('memo-export')?.addEventListener('click', () => {
    const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `备忘录-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
