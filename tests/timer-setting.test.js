const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, sleep } = require('./helpers');

function chips(document) {
  return Array.from(document.querySelectorAll('#timerChipRow .timer-chip'));
}

function selectedChipLabel(document) {
  const el = chips(document).find(c => c.classList.contains('selected'));
  return el && el.textContent;
}

test('defaults the answer timer to 20s when nothing is persisted', () => {
  const dom = createApp();
  const { document } = dom.window;
  try {
    assert.equal(selectedChipLabel(document), '20s');
    assert.equal(chips(document).map(c => c.textContent).join(','), '10s,15s,20s,30s');
    assert.match(document.getElementById('classicModeDesc').textContent, /20 seconds each/);
    assert.match(document.getElementById('survivalModeDesc').textContent, /within 20 seconds/);
  } finally {
    dom.window.close();
  }
});

test('restores a previously persisted timer value on load', () => {
  const dom = createApp({ timerStorageValue: '15' });
  const { document } = dom.window;
  try {
    assert.equal(selectedChipLabel(document), '15s');
    assert.match(document.getElementById('classicModeDesc').textContent, /15 seconds each/);
  } finally {
    dom.window.close();
  }
});

test('falls back to 20s when the persisted value is not a valid number', () => {
  const dom = createApp({ timerStorageValue: 'not-a-number' });
  const { document } = dom.window;
  try {
    assert.equal(selectedChipLabel(document), '20s');
  } finally {
    dom.window.close();
  }
});

test('clicking a chip updates selection, persists it, and refreshes both mode-card descriptions', () => {
  const dom = createApp();
  const { window } = dom;
  const { document } = window;
  try {
    window.setTimerSeconds(30);

    assert.equal(selectedChipLabel(document), '30s');
    assert.equal(window.localStorage.getItem('mmg-timer'), '30');
    assert.match(document.getElementById('classicModeDesc').textContent, /30 seconds each/);
    assert.match(document.getElementById('survivalModeDesc').textContent, /within 30 seconds/);

    window.setTimerSeconds(10);
    assert.equal(selectedChipLabel(document), '10s');
    assert.equal(chips(document).filter(c => c.classList.contains('selected')).length, 1);
  } finally {
    window.close();
  }
});

test('mode-card descriptions interpolate the question count and current timer value', () => {
  const dom = createApp({ timerStorageValue: '15' });
  const { document } = dom.window;
  try {
    assert.equal(
      document.getElementById('classicModeDesc').textContent,
      '10 questions, 15 seconds each — answer as fast as you can before the clock runs out on each one!'
    );
    assert.equal(
      document.getElementById('survivalModeDesc').textContent,
      'Help the monkey climb the tree! Answer within 15 seconds to climb higher — get it wrong and it slips back down.'
    );
  } finally {
    dom.window.close();
  }
});

test('starting Classic seeds the per-question countdown from the selected timer value', () => {
  const dom = createApp({ timerStorageValue: '30' });
  const { window } = dom;
  const { document } = window;
  try {
    window.startClassic();
    assert.equal(document.getElementById('classicCountdownNum').textContent, '30.0s');
    assert.equal(document.getElementById('classicCountdownBar').style.width, '100%');
  } finally {
    window.exitToMenu();
    window.close();
  }
});

test('starting Survival seeds the per-question countdown from the selected timer value', () => {
  const dom = createApp({ timerStorageValue: '30' });
  const { window } = dom;
  const { document } = window;
  try {
    window.startSurvival();
    assert.equal(document.getElementById('survivalCountdownNum').textContent, '30.0s');
    assert.equal(document.getElementById('survivalCountdownBar').style.width, '100%');
  } finally {
    window.exitToMenu();
    window.close();
  }
});

test('changing the timer mid-round does not affect the round already in progress (Classic)', async () => {
  const dom = createApp({ timerStorageValue: '20' });
  const { window } = dom;
  const { document } = window;
  try {
    window.startClassic();
    await sleep(350); // let a few 100ms countdown ticks fire against the 20s round

    const pctAgainst20 = parseFloat(document.getElementById('classicCountdownBar').style.width);
    assert.ok(pctAgainst20 > 90 && pctAgainst20 <= 100, `expected ~90-100%, got ${pctAgainst20}%`);

    // Simulate the player tapping a different chip mid-round.
    window.setTimerSeconds(10);
    await sleep(250);

    const pctAfterChange = parseFloat(document.getElementById('classicCountdownBar').style.width);
    // If the in-progress round were wrongly re-based on the new 10s value, an
    // elapsed ~0.6s of a 10s clock would read ~194% (or similarly far off).
    // It should still read as a fraction of the original 20s (~85-100%).
    assert.ok(pctAfterChange > 85 && pctAfterChange <= 100, `expected the round to keep counting down against 20s, got ${pctAfterChange}%`);

    // The picker's own copy still updates immediately for the *next* round.
    assert.match(document.getElementById('classicModeDesc').textContent, /10 seconds each/);
  } finally {
    window.exitToMenu();
    window.close();
  }
});

test('changing the timer mid-round does not affect the round already in progress (Survival)', async () => {
  const dom = createApp({ timerStorageValue: '20' });
  const { window } = dom;
  const { document } = window;
  try {
    window.startSurvival();
    await sleep(350);

    window.setTimerSeconds(10);
    await sleep(250);

    const pctAfterChange = parseFloat(document.getElementById('survivalCountdownBar').style.width);
    assert.ok(pctAfterChange > 85 && pctAfterChange <= 100, `expected the round to keep counting down against 20s, got ${pctAfterChange}%`);
  } finally {
    window.exitToMenu();
    window.close();
  }
});
