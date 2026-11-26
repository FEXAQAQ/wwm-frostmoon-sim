/* =====================================================================
 * 自動測試用（不屬於遊戲本體）：在頁面上直接推進模擬，不依賴畫面更新。
 * 用法（瀏覽器主控台）：
 *   __runSync(['dark','chang'], 'D1', { targetVar: 'me' })   // 自動模式跑指定機制
 *   __runSync(STEPS.map(s => s.id), 'H', {}, false)           // 玩家什麼都不做（應該要失敗）
 *   __matrix(3)                                                // 全部機制 × 5 職能 × 4 組變體 × 3 次
 * ===================================================================== */

window.__runSync = (ids, role, vars = {}, auto = true) => {
  const out = [],
    keep = { ...stats }; // 測試不計入「通過／嘗試」次數
  window.__autopilot = auto;
  Object.keys(vars).forEach((k) => (window['__force_' + k] = vars[k]));
  for (const id of ids) {
    $('mode').value = id;
    $('role').value = role;
    start();
    let n = 0;
    while (state === 'running' && n < 40000) {
      simulate(1 / 30);
      n++;
    }
    const b = $('banner');
    out.push(
      `${id} [${role}] ${state === 'running' ? 'TIMEOUT' : b.className.replace('hud box ', '')} t=${t.toFixed(1)} ` +
        b.innerText.replace(/\s+/g, ' ').slice(0, 220),
    );
  }
  Object.keys(vars).forEach((k) => delete window['__force_' + k]);
  window.__autopilot = false;
  stats = keep;
  saveStats();
  return out.join('\n');
};

window.__matrix = (reps = 1) => {
  const ids = STEPS.map((s) => s.id),
    res = [];
  const VARS = [{}, { targetVar: 'me', lightVar: 'four' }, { lightVar: 'three', dollVar: '3' }, { lightVar: 'center', dollVar: '6', targetVar: 'me' }];
  for (let r = 0; r < reps; r++)
    for (const role of ROLE_IDS)
      for (const v of VARS)
        __runSync(ids, role, v)
          .split('\n')
          .filter((l) => !/ ok /.test(l))
          .forEach((l) => res.push(JSON.stringify(v) + ' ' + l));
  return res.length ? res.join('\n') : `ALL OK (${reps * ROLE_IDS.length * VARS.length * ids.length} runs)`;
};
