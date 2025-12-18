(() => {
  let nameInput;
  let chips;
  let resultsEl;
  let countEl;
  let live;
  let resultsCard;

  let btnDraw;
  let btnReset;
  let btnAdd;
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

  function normalizeNames(names) {
    return names.map(n => n.trim()).filter(Boolean);
  }

  function renderChips() {
    chips.replaceChildren();
    const frag = document.createDocumentFragment();
    state.names.forEach((name, index) => {
      const el = document.createElement('span');
      el.className = 'chip';

      const label = document.createElement('span');
      label.className = 'chip-label';
      label.textContent = name;

      const remove = document.createElement('button');
      remove.className = 'chip-remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => removeNameAt(index));
      remove.disabled = false;

      el.append(label, remove);
      frag.appendChild(el);
    }
    );
    chips.appendChild(frag);
    countEl.textContent = `${state.names.length} ${state.names.length === 1 ? 'name' : 'names'}`;
  }

  function setButtons() {
    const hasNames = state.names.length > 0;
    const hasInput = (nameInput?.value ?? '').trim().length > 0;
    btnDraw.disabled = !hasNames;
    btnReset.disabled = !(hasNames || state.locked || hasInput);
    btnAdd.disabled = state.locked;
    const hasResults = state.assigned.length > 0;
    if (resultsCard) resultsCard.hidden = !hasResults;
    btnCopy.disabled = !hasResults;
    btnCsv.disabled = !hasResults;
    btnPrint.disabled = !hasResults;
  }

  function getAssignedSorted() {
    return [...state.assigned].sort((a, b) => a.number - b.number);
  }

  function clearResultsIfAny() {
    if (state.assigned.length === 0) return;
    state.assigned = [];
    resultsEl.replaceChildren();
  }

  function addNamesFromInput() {
    if (state.locked) return;
    const raw = (nameInput.value ?? '').trim();
    if (!raw) {
      setButtons();
      return;
    }

    const parsed = normalizeNames(parseNames(raw));
    if (parsed.length === 0) {
      nameInput.value = '';
      setButtons();
      return;
    }

    state.names.push(...parsed);
    nameInput.value = '';
    clearResultsIfAny();
    renderChips();
    setButtons();
    live.textContent = `${parsed.length} ${parsed.length === 1 ? 'name' : 'names'} added.`;
    nameInput.focus();
  }

  function commitDelimitedNamesFromInput() {
    if (state.locked) return;
    const raw = (nameInput.value ?? '');
    if (!raw) {
      setButtons();
      return;
    }

    const parts = raw.split(/[,;\r\n]+/);
    if (parts.length <= 1) {
      setButtons();
      return;
    }

    const endsWithDelimiter = /[,;\r\n]\s*$/.test(raw);
    let remainder = '';
    if (!endsWithDelimiter) {
      remainder = parts.pop() ?? '';
    }

    const parsed = normalizeNames(parts);
    if (parsed.length > 0) {
      state.names.push(...parsed);
      clearResultsIfAny();
      renderChips();
      live.textContent = `${parsed.length} ${parsed.length === 1 ? 'name' : 'names'} added.`;
    }

    nameInput.value = remainder.trimStart();
    setButtons();
  }

  function removeNameAt(index) {
    if (index < 0 || index >= state.names.length) return;
    state.names.splice(index, 1);
    renderChips();
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
    for (const { name, number } of getAssignedSorted()) {
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
    state.names = [];
    state.assigned = [];
    resultsEl.replaceChildren();
    if (nameInput) nameInput.value = '';
    renderChips();
    setButtons();
    live.textContent = 'Reset complete';
    nameInput?.focus();
  }

  async function copyToClipboard() {
    const text = getAssignedSorted().map(({ name, number }) => `${number}.) ${name}`).join('\n');
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
    const lines = [['Name','Number'], ...getAssignedSorted().map(({name, number}) => [name, number])];
    const csv = lines.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'draw.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function init() {
    nameInput = document.getElementById('name-input');
    chips = document.getElementById('chip-list');
    resultsEl = document.getElementById('results');
    countEl = document.getElementById('count');
    live = document.getElementById('live');
    resultsCard = document.querySelector('.results-card');

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    btnDraw = document.getElementById('btn-draw');
    btnReset = document.getElementById('btn-reset');
    btnAdd = document.getElementById('btn-add');
    btnCopy = document.getElementById('btn-copy');
    btnCsv = document.getElementById('btn-csv');
    btnPrint = document.getElementById('btn-print');

    if (!nameInput || !chips || !resultsEl || !countEl || !live || !resultsCard || !btnDraw || !btnReset || !btnAdd || !btnCopy || !btnCsv || !btnPrint) {
      return;
    }

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNamesFromInput();
        return;
      }
      if (e.key === ',' || e.key === ';') {
        e.preventDefault();
        addNamesFromInput();
      }
    });
    nameInput.addEventListener('input', () => {
      commitDelimitedNamesFromInput();
      setButtons();
    });
    btnAdd.addEventListener('click', addNamesFromInput);
    btnDraw.addEventListener('click', draw);
    btnReset.addEventListener('click', reset);
    btnCopy.addEventListener('click', copyToClipboard);
    btnCsv.addEventListener('click', downloadCsv);
    btnPrint.addEventListener('click', () => window.print());

    renderChips();
    setButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();