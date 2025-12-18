(() => {
  let ta;
  let chips;
  let resultsEl;
  let countEl;
  let live;

  let btnDraw;
  let btnReset;
  let btnCopy;
  let btnCsv;
  let btnPrint;

  const state = { names: [], assigned: [], locked: false };

  function parseNames(text) {
    return text
      .split(new RegExp('\\r?\\n|,|;', 'g'))
      .map(s => s.trim())
      .filter(Boolean);
  }

  function renderChips() {
    chips.replaceChildren();
    const frag = document.createDocumentFragment();
    for (const n of state.names) {
      const el = document.createElement('span');
      el.className = 'chip';
      el.textContent = n;
      frag.appendChild(el);
    }
    chips.appendChild(frag);
    countEl.textContent = `${state.names.length} ${state.names.length === 1 ? 'name' : 'names'}`;
  }

  function setButtons() {
    const hasNames = state.names.length > 0;
    btnDraw.disabled = !hasNames || state.locked;
    btnReset.disabled = !(hasNames || state.locked);
    const hasResults = state.assigned.length > 0;
    btnCopy.disabled = !hasResults;
    btnCsv.disabled = !hasResults;
    btnPrint.disabled = !hasResults;
  }

  function handleInput() {
    if (state.locked) return; // do not mutate after draw
    state.names = parseNames(ta.value);
    renderChips();
    resultsEl.replaceChildren();
    state.assigned = [];
    setButtons();
  }

  function cryptoShuffle(nums) {
    // Fisher–Yates using crypto.getRandomValues
    for (let i = nums.length - 1; i > 0; i--) {
      const u32 = new Uint32Array(1);
      crypto.getRandomValues(u32);
      const j = u32[0] % (i + 1);
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
  }

  function draw() {
    const N = state.names.length;
    if (N === 0) return;
    const nums = Array.from({ length: N }, (_, i) => i + 1); // 1..N sequential
    cryptoShuffle(nums);
    state.assigned = state.names.map((name, i) => ({ name, number: nums[i] }));
    state.locked = true;
    renderResults();
    setButtons();
    live.textContent = `Draw complete. ${N} assignments.`;
  }

  function renderResults() {
    resultsEl.replaceChildren();
    const frag = document.createDocumentFragment();
    let delay = 0;
    for (const { name, number } of state.assigned) {
      const li = document.createElement('li');
      li.className = 'result';
      li.style.animationDelay = `${delay}ms`;
      delay += 15; // gentle stagger
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = number;
      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = name;
      li.append(badge, nameEl);
      frag.appendChild(li);
    }
    resultsEl.appendChild(frag);
  }

  function reset() {
    state.locked = false;
    state.assigned = [];
    resultsEl.replaceChildren();
    setButtons();
    live.textContent = 'Reset complete';
  }

  async function copyToClipboard() {
    const text = state.assigned.map(({ name, number }) => `${name},${number}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      live.textContent = 'Copied to clipboard';
    } catch (_) {
      // Fallback: create a hidden textarea
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch(_) {}
      document.body.removeChild(t);
      live.textContent = 'Copied to clipboard';
    }
  }

  function downloadCsv() {
    const lines = [['Name','Number'], ...state.assigned.map(({name, number}) => [name, number])];
    const csv = lines.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'draw.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function init() {
    ta = document.getElementById('names');
    chips = document.getElementById('chip-list');
    resultsEl = document.getElementById('results');
    countEl = document.getElementById('count');
    live = document.getElementById('live');

    btnDraw = document.getElementById('btn-draw');
    btnReset = document.getElementById('btn-reset');
    btnCopy = document.getElementById('btn-copy');
    btnCsv = document.getElementById('btn-csv');
    btnPrint = document.getElementById('btn-print');

    if (!ta || !chips || !resultsEl || !countEl || !live || !btnDraw || !btnReset || !btnCopy || !btnCsv || !btnPrint) {
      return;
    }

    ta.addEventListener('input', handleInput);
    btnDraw.addEventListener('click', draw);
    btnReset.addEventListener('click', reset);
    btnCopy.addEventListener('click', copyToClipboard);
    btnCsv.addEventListener('click', downloadCsv);
    btnPrint.addEventListener('click', () => window.print());
    handleInput();
    setButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();