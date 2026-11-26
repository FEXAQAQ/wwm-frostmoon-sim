/* =====================================================================
 * 王 A：桃靨劍姬
 * 分兩個階段：
 *   明亮階段（P1）：多種點名。長虹貫日遠離人群、千花綻放分散、天外飛仙紅圈卸勢、流光劍舞多段卸勢。
 *   黑暗階段（P2）：場地變黑，只剩幾種型態的光亮區域；P1 的點名穿插出現且傷害變秒殺，要站進光亮區域。
 * 光亮區域型態（俯視示意圖）：
 *   four   場地中圈上 4 個燈（北／東／南／西）
 *   center 中央一大圈
 *   three  中圈上 3 個燈（北／東／西）
 * ===================================================================== */

const RING_R = 13, // 中圈燈光離中心距離
  RING_LIGHT_R = 3.6, // 中圈燈光半徑
  CENTER_LIGHT_R = 9; // 中央大燈光半徑
const LAYOUT_NAME = { four: '中圈 4 個燈（東南西北）', center: '中央一大圈', three: '中圈 3 個燈（北東西）' };
// 每種型態：燈的角度、每人分到哪個燈的哪個位置（-1／+1 是燈內左右兩側，0 是中間）
const LAYOUTS = {
  four: { angs: [0, 90, 180, 270], slot: { T: [0, -1], H: [0, 1], D1: [1, 0], D2: [2, 0], D3: [3, 0] } },
  three: { angs: [0, 90, 270], slot: { T: [0, -1], H: [0, 1], D1: [1, -1], D2: [1, 1], D3: [2, 0] } },
  center: { angs: null },
};
let layoutKind = null;
function lightsOn() {
  clearLights();
  setDark(false);
  layoutKind = null;
}
function darkLayout(kind) {
  clearLights();
  setDark(true);
  layoutKind = kind;
  if (kind === 'center') addLight(0, 0, CENTER_LIGHT_R);
  else LAYOUTS[kind].angs.forEach((a) => addLight(...Object.values(posAt(a, RING_R)), RING_LIGHT_R));
}
// 黑暗階段的站位：依型態分到燈裡；avoid＝被點名「遠離人群」的人，和他同一個燈的人換到別的燈
function layoutSpot(m, avoid) {
  if (layoutKind === 'center') {
    if (avoid && m === avoid) return posAt(POOL_ANG[m.id], CENTER_LIGHT_R - 1.2);
    return posAt(POOL_ANG[m.id], avoid ? 2.6 : 5.2);
  }
  const L = LAYOUTS[layoutKind];
  let [li, s] = L.slot[m.id];
  if (avoid && m !== avoid && L.slot[avoid.id][0] === li) {
    // 換到最近的另一個燈，站空著的那一側（兩側都有人就站中間）
    const mine = L.angs[li];
    li = L.angs
      .map((a, i) => i)
      .filter((i) => i !== li)
      .sort((x, y) => angDiff(L.angs[x], mine) - angDiff(L.angs[y], mine))[0];
    const used = Object.values(L.slot)
      .filter(([l]) => l === li)
      .map(([, ss]) => ss);
    s = !used.includes(1) ? 1 : !used.includes(-1) ? -1 : 0;
  } else if (avoid && m === avoid) s = 0;
  const a = L.angs[li];
  const c = posAt(a, RING_R);
  return posAt(a + 90, s * 1.7, c);
}

/* ======================= 明亮階段 ======================= */

/* ---------- 長虹貫日：黃條接黃圈點名，被點名的人遠離人群（兩輪） ---------- */
function mChanghong(next) {
  lightsOn();
  const BOOM = 4.5;
  let tgNow = null;
  setCast('長虹貫日', '明亮階段：黃條接黃圈點名，被點名的人遠離人群', 3);
  advice = '大家在王身邊；被點名的人跑離人群（爆炸 4.5m）';
  setPlan((m) => (m === tgNow ? posAt(POOL_ANG[m.id], 12) : posAt(POOL_ANG[m.id], 2.6)), 0.3);
  const a = pickTarget(),
    b = pickTarget([a]);
  const round = (tg, hitT, last) => {
    at(hitT - 4.5, () => {
      if (state !== 'running') return;
      tgNow = tg;
      members.forEach((m) => (m.reactAt = t + 0.3));
      setCast('長虹貫日', `點名 ${who(tg)}：黃圈爆炸 ${BOOM}m，遠離人群`, 4.5);
      advice = tg === player ? '你被點名：跑離人群（離大家 4.5m 以上）' : `留在王身邊，讓 ${who(tg)} 自己跑開`;
      setTag(tg, '長虹貫日', '#ffd34a');
      followCircle(tg, BOOM, 0xffc23a, hitT, 0.22);
      projectile({ x: bossPos.x, z: bossPos.z, y: 3 }, tg, hitT, 0.5, 0xffe0a0);
    });
    at(hitT, () => {
      if (state !== 'running') return;
      setTag(tg, '');
      boom(tg, BOOM, 0xffd36a);
      tgNow = null;
      const near = members.filter((m) => m !== tg && dist(m, tg) < BOOM && !invuln(m));
      if (near.length)
        return fail('長虹貫日', [
          `${who(tg)} 的爆炸波及到 ${near.map(who).join('、')}（${BOOM}m 內）：被點名的人要遠離人群，其他人不要跟過去。`,
        ]);
      if (last) {
        cast = null;
        next();
      }
    });
  };
  round(a, t + 5, false);
  round(b, t + 11, true);
}

/* ---------- 千花綻放：點名全員，分散即可 ---------- */
const QIAN_R = 3;
function qianhuaJudge(title) {
  members.forEach((m) => {
    setTag(m, '');
    boom(m, QIAN_R, 0xff9ec4);
  });
  return judge(title, (m) => {
    if (dark && !inLight(m)) return `${who(m)} 在黑暗中（${where(m)}）被千花綻放命中 → 黑暗階段直接秒殺，要站進光亮區域。`;
    const near = members.filter((o) => o !== m && dist(o, m) < QIAN_R);
    if (near.length) return `${who(m)} 和 ${near.map(who).join('、')} 太近（${QIAN_R}m 內），爆炸互相波及：大家分散。`;
    return '';
  });
}
function qianhuaMarks(hitT) {
  members.forEach((m) => {
    setTag(m, '千花綻放', '#ffb0d0');
    followCircle(m, QIAN_R, 0xff6aa0, hitT, 0.2);
    projectile({ x: bossPos.x, z: bossPos.z, y: 5 }, m, hitT, 0.6, 0xffb0d0);
  });
}
function mQianhua(next) {
  lightsOn();
  setCast('千花綻放', '明亮階段：點名全員，每人腳下爆炸 3m，分散即可', 5);
  advice = '散開，和每個人保持 3m 以上';
  setPlan((m) => posAt(POOL_ANG[m.id], 7), 0.3);
  bossFly(5);
  const hitT = t + 5;
  qianhuaMarks(hitT);
  at(hitT, () => {
    if (!qianhuaJudge('千花綻放')) return;
    bossFly(0, 0.4);
    cast = null;
    next();
  });
}

/* ---------- 天外飛仙：飛到空中，多次紅圈點名，卸勢 ---------- */
const FLY_R = 2.5;
// 一次天外飛仙：tg 被點名，hitT 命中；回傳 Promise 般的 callback 介面
function flyHit(tg, hitT, onOk) {
  at(hitT - 2.4, () => {
    if (state !== 'running') return;
    setTag(tg, '天外飛仙', '#ff6a8a');
    followCircle(tg, FLY_R, 0xff3a5a, hitT, 0.3);
    parryCue(tg, hitT);
    if (tg === player) advice = dark ? '你被點名：在光亮區域裡按 F 卸勢' : '你被點名：離開隊友，白圈縮到腳下按 F 卸勢';
  });
  at(hitT, () => {
    if (state !== 'running') return;
    setTag(tg, '');
    bossJumpTo(add(tg, norm(sub(bossPos, tg)), 1.2));
    boom(tg, FLY_R, 0xff6a8a);
    const reasons = [];
    if (dark && !inLight(tg)) reasons.push(`${who(tg)} 在黑暗中（${where(tg)}）：黑暗階段只有光亮區域裡才能卸勢，傷害是秒殺級。`);
    else if (!parried(tg, hitT)) reasons.push(`${who(tg)} 沒有卸勢（F）：突進命中 → 眩暈 4 秒。`);
    members.forEach((m) => {
      if (m !== tg && !invuln(m) && dist(m, tg) < FLY_R)
        reasons.push(`${who(m)} 站在 ${who(tg)} 的紅圈裡（${FLY_R}m）被波及：別和被點名的人擠在一起，或用空白鍵閃避。`);
    });
    if (reasons.length) return fail('天外飛仙', reasons);
    onOk && onOk();
  });
}
function mTianwai(next) {
  lightsOn();
  setPlan((m) => posAt(POOL_ANG[m.id], 7), 0.3);
  setCast('天外飛仙', '明亮階段：飛到空中，連續紅圈點名 3 人，卸勢', 3);
  advice = '散開站好；紅圈在你腳下時，白圈縮到腳下就按 F 卸勢';
  bossFly(5);
  const a = pickTarget(),
    rest = shuffle(members.filter((m) => m !== a));
  const order = [a, rest[0], rest[1]];
  const t0 = t;
  order.forEach((tg, i) =>
    flyHit(tg, t0 + 4 + i * 2.6, () => {
      if (i < 2) return;
      bossFly(0, 0.4);
      bossMoveTo({ x: 0, z: 0 }, 8);
      cast = null;
      next();
    }),
  );
}

/* ---------- 流光劍舞：對點名目標連續 4 段高額劍舞，每段都要卸勢 ---------- */
function mLiuguang(next) {
  lightsOn();
  const tg = pickTarget();
  setCast('流光劍舞', `點名 ${who(tg)}：連續 4 段高額傷害，每一段都要卸勢`, 3);
  advice =
    tg === player ? '你被點名：站著不動，每次白圈縮到腳下就按 F（共 4 下）' : `離 ${who(tg)} 遠一點（劍舞範圍 3m）`;
  setTag(tg, '流光劍舞', '#ff9ec4');
  setPlan((m) => posAt(POOL_ANG[m.id], 7), 0.3);
  const t0 = t;
  at(t0 + 1.5, () => bossMoveTo(posAt(POOL_ANG[tg.id], 5.2), 8));
  const hits = [3.6, 4.5, 5.4, 6.3].map((k) => t0 + k);
  followCircle(tg, 3, 0xff6aa0, hits[3] + 0.1, 0.22);
  hits.forEach((h, i) => {
    parryCue(tg, h);
    at(h, () => {
      if (state !== 'running') return;
      boom(tg, 3, 0xff9ec4);
      const reasons = [];
      if (!parried(tg, h)) reasons.push(`${who(tg)} 第 ${i + 1} 段沒有卸勢（F）：劍舞每一段都要卸，節奏約 0.9 秒一下。`);
      members.forEach((m) => {
        if (m !== tg && dist(m, tg) < 3 && !invuln(m))
          reasons.push(`${who(m)} 站在 ${who(tg)} 旁邊（${dist(m, tg).toFixed(1)}m），被流光劍舞波及：離被點名的人 3m 以上。`);
      });
      if (reasons.length) return fail('流光劍舞', reasons);
      if (i === 3) {
        setTag(tg, '');
        bossMoveTo({ x: 0, z: 0 }, 8);
        cast = null;
        next();
      }
    });
  });
}

/* ======================= 黑暗階段 ======================= */

/* ---------- 黑暗階段：燈光型態＋穿插點名（秒殺級） ---------- */
function mDark(next) {
  lightsOn();
  const kind = variant('lightVar', ['four', 'center', 'three']);
  setCast('黑暗階段', '場地變黑，出現光亮區域：之後的點名在黑暗中都是秒殺', 3);
  advice = '找到光亮區域站進去（金色圈是你的位置）';
  at(t + 1.2, () => darkLayout(kind));
  setPlan(() => null);
  at(t + 1.3, () => setPlan((m) => layoutSpot(m), 0.2));
  const t0 = t;
  // 1) 長虹貫日（黑暗版）：被點名的人進燈光，同燈的人換到別的燈
  const tgA = pickTarget();
  let avoid = null;
  at(t0 + 6, () => {
    if (state !== 'running') return;
    if (!judge('黑暗階段', (m) => (inLight(m) ? '' : `${who(m)} 還在黑暗中（${where(m)}）：變黑後要第一時間站進光亮區域。`))) return;
    avoid = tgA;
    setPlan((m) => layoutSpot(m, avoid), 0.3);
    setCast('長虹貫日', `黑暗中點名 ${who(tgA)}：要在光亮區域裡，並遠離其他人`, 5);
    advice =
      tgA === player
        ? '你被點名：留在光亮區域，同一個燈的人會讓開'
        : '如果和被點名的人同一個燈，換到旁邊的燈（金色圈）';
    setTag(tgA, '長虹貫日', '#ffd34a');
    followCircle(tgA, 4.5, 0xffc23a, t0 + 11, 0.22);
  });
  at(t0 + 11, () => {
    if (state !== 'running') return;
    setTag(tgA, '');
    boom(tgA, 4.5, 0xffd36a);
    const reasons = [];
    if (!inLight(tgA)) reasons.push(`${who(tgA)} 在黑暗中（${where(tgA)}）被長虹貫日命中 → 秒殺。`);
    members.forEach((m) => {
      if (m !== tgA && dist(m, tgA) < 4.5 && !invuln(m))
        reasons.push(`${who(m)} 離被點名的 ${who(tgA)} 太近（4.5m 內）被波及：同一個燈的人要換到別的燈。`);
    });
    if (reasons.length) return fail('黑暗階段・長虹貫日', reasons);
    avoid = null;
    setPlan((m) => layoutSpot(m), 0.3);
  });
  // 2) 天外飛仙（黑暗版）：點名 2 人，要在光亮區域卸勢
  const tgB = pickTarget(),
    tgC = pickTarget([tgB]);
  at(t0 + 13.5, () => {
    if (state !== 'running') return;
    setCast('天外飛仙', '黑暗中紅圈點名 2 人：光亮區域裡才能卸勢', 6);
    advice = '留在光亮區域；被點名時白圈縮到腳下按 F';
    bossFly(5);
  });
  flyHit(tgB, t0 + 16.5);
  // 黑暗版天外飛仙：同燈的人要避開紅圈 → 同一個燈的兩人本來就相隔 3.4m（紅圈 2.5m）
  flyHit(tgC, t0 + 19.1);
  // 3) 千花綻放（黑暗版）：全員點名，要在光亮區域並分散
  at(t0 + 20, () => {
    if (state !== 'running') return;
    setCast('千花綻放', '黑暗中點名全員：都要在光亮區域裡，並彼此分散 3m', 5);
    advice = '留在你的光亮區域位置（同一個燈的兩人站兩側）';
    qianhuaMarks(t0 + 25);
  });
  at(t0 + 25, () => {
    if (state !== 'running') return;
    if (!qianhuaJudge('黑暗階段・千花綻放')) return;
    bossFly(0, 0.4);
    cast = null;
    next();
  });
}

/* ---------- 百戲人偶：場地由外向內變暗，30 秒內用太極把人偶丟到王身邊集合擊殺 ---------- */
function mBaixi(next) {
  lightsOn();
  bossJumpTo({ x: 0, z: 0 }); // 坦把王拉在場地中央
  const n = +variant('dollVar', ['6', '3']);
  const throwers = ['H', 'D1', 'D2', 'D3'];
  const base = n === 6 ? 30 : 60;
  const dolls = [];
  for (let k = 0; k < n; k++) {
    const p = posAt(base + (360 / n) * k + (Math.random() * 16 - 8), 14);
    const e = addEnemy({ name: '人偶', x: p.x, z: p.z, hp: 8, r: 0.6, model: puppetModel(1), barY: 2.3 });
    e.owner = throwers[Math.floor((k * 4) / n)];
    dolls.push(e);
  }
  // 場地由外向內逐漸變暗：中央光亮區域慢慢縮小
  setDark(true);
  const glow = addLight(0, 0, ARENA_R);
  const t0 = t,
    END = 30;
  setCast('百戲人偶', `${n} 隻人偶：倒數 30 秒後每隻都對全員暗殺一次`, END);
  const mine = dolls.filter((d) => d.owner === player.id);
  advice = player.tank
    ? '坦：把王拉在場地中央，在王身邊等人偶被丟過來一起清'
    : mine.length
      ? '走到你負責的人偶旁（頭上有「你的」），按 Q 太極把它丟到王腳下，再回中央一起打'
      : '這次沒有分到人偶：在王旁邊等大家丟過來，一起清';
  dolls.forEach((d) => {
    const l = makeLabel(d.owner === player.id ? '你的' : ROLE_INFO[d.owner].label, d.owner === player.id ? '#ffd34a' : '#fff');
    l.position.y = 3.0;
    l.scale.multiplyScalar(0.8);
    d.obj.add(l);
  });
  // 太極：身邊 6.5m 內還沒丟過的人偶 → 飛到王腳下
  skillHook.taiji = (m) => {
    dolls.forEach((d) => {
      if (!d.alive || d.thrown || dist(d, m) > TAIJI_R) return;
      d.thrown = true;
      const to = posAt(Math.random() * 360, 0.8 + Math.random() * 0.8), // 丟到場地中央（王腳下）
        from = { x: d.x, z: d.z },
        s = t;
      tick(() => {
        const k = Math.min(1, (t - s) / 0.5);
        d.x = from.x + (to.x - from.x) * k;
        d.z = from.z + (to.z - from.z) * k;
        d.y = Math.sin(k * Math.PI) * 3;
        return k >= 1;
      });
    });
  };
  // NPC（與自動模式）：靠近自己的人偶就放太極
  tick(() => {
    if (state !== 'running') return true;
    members.forEach((m) => {
      if (m.isPlayer && !autoOn()) return;
      if (dolls.some((d) => d.alive && !d.thrown && d.owner === m.id && dist(d, m) < 4.5)) pressSkill(m);
    });
    return alive(dolls).length === 0;
  });
  setPlan((m) => {
    if (m.tank) return posAt(0, 1.6, bossPos);
    const todo = dolls.find((d) => d.alive && !d.thrown && d.owner === m.id);
    if (todo) return add(todo, norm(sub(bossPos, todo)), 3);
    return posAt(POOL_ANG[m.id], 1.8, bossPos);
  }, 0.4);
  tick(() => {
    if (state !== 'running') return true;
    setLightR(glow, Math.max(5, ARENA_R - ((t - t0) / END) * (ARENA_R - 5)));
    if (cast) cast.sub = `剩 ${alive(dolls).length} 隻人偶，暗殺倒數 ${Math.max(0, END - (t - t0)).toFixed(0)} 秒（場地由外向內變暗）`;
    if (alive(dolls).length === 0) {
      skillHook = {};
      cast = null;
      at(t + 0.5, () => {
        lightsOn();
        next();
      });
      return true;
    }
    if (t - t0 >= END) {
      const left = alive(dolls);
      const out = left.filter((d) => !d.thrown);
      fail('百戲人偶', [
        `倒數結束還剩 ${left.length} 隻人偶 → 每隻都對全團造成一次暗殺（疊暗殺印記與易傷，第 3 次直接秒殺）。`,
        ...out.map((d) => `${who(byId(d.owner))} 負責的人偶還在${where(d)}沒有丟回王身邊：走到它旁邊按 Q（太極）。`),
      ]);
      return true;
    }
  });
}

/* ---------- 天女散花：多次紅圈點名，及時站進光亮區域卸勢 ---------- */
function mTiannv(next) {
  darkLayout(variant('lightVar', ['four', 'center', 'three']));
  setPlan((m) => layoutSpot(m), 0.3);
  setCast('天女散花', `黑暗中（${LAYOUT_NAME[layoutKind]}）：多次紅圈點名，站進光亮區域卸勢`, 3);
  advice = '先站進光亮區域；紅圈在你腳下時，白圈縮到腳下按 F';
  bossFly(6);
  const a = pickTarget(),
    rest = shuffle(members.filter((m) => m !== a));
  const order = [a, rest[0], rest[1], rest[2]],
    t0 = t;
  const R = 2;
  order.forEach((tg, i) => {
    const hitT = t0 + 5 + i * 2;
    at(hitT - 2.2, () => {
      if (state !== 'running') return;
      setTag(tg, '天女散花', '#ffb0d0');
      followCircle(tg, R, 0xff3a5a, hitT, 0.3);
      parryCue(tg, hitT);
      projectile({ x: bossPos.x, z: bossPos.z, y: 6 }, tg, hitT, 0.9, 0xff8ac0, 0.5);
    });
    at(hitT, () => {
      if (state !== 'running') return;
      setTag(tg, '');
      const reasons = [];
      if (!inLight(tg) || !parried(tg, hitT)) {
        boom(tg, R, 0xff5a7a);
        reasons.push(
          !inLight(tg)
            ? `${who(tg)} 在黑暗中（${where(tg)}）：黑暗中無法卸勢 → 紅圈爆炸。`
            : `${who(tg)} 沒有卸勢（F）→ 紅圈爆炸。`,
        );
        members.forEach((m) => {
          if (m !== tg && dist(m, tg) < R && !invuln(m)) reasons.push(`${who(m)} 碰到 ${who(tg)} 的紅圈，被爆炸波及。`);
        });
      } else boom(tg, 1.0, 0xffd0e4);
      if (reasons.length) return fail('天女散花', reasons);
      if (i === order.length - 1) {
        bossFly(0, 0.4);
        cast = null;
        next();
      }
    });
  });
}

/* ---------- 百戲人偶·巨：四個角落 4 隻大人偶，腳下燈光不斷縮小；集火兩隻，再分散進燈光應對全員點名 ---------- */
function mJuren(next) {
  clearLights();
  setDark(true);
  layoutKind = null;
  bossMoveTo({ x: 0, z: 0 }, 8);
  const SHRINK = 0.3,
    MIN_R = 1.6; // 沒打死的人偶腳下仍有很小的光亮區域（可站 1～2 人）
  const rot = rand(4) * 90;
  const bigs = [0, 1, 2, 3].map((k) => {
    const p = posAt(rot + 45 + k * 90, 11);
    const e = addEnemy({ name: '巨人偶', x: p.x, z: p.z, hp: 16, r: 1.1, model: puppetModel(2.0, 0x8050b0), barY: 4.6 });
    e.light = addLight(p.x, p.z, 6);
    e.invuln = true; // 出場動畫：1.5 秒後才能打
    return e;
  });
  const focus = [bigs[0], bigs[1]]; // 集火相鄰的兩隻（依序）
  focus.forEach((f, i) => {
    const l = makeLabel(`集火 ${i + 1}`, '#ffd34a');
    l.position.y = 5.6;
    l.scale.multiplyScalar(1.2);
    f.obj.add(l);
  });
  setCast('百戲人偶·巨', `四個角落各一隻，腳下燈光不斷縮小：先打${where(focus[0])}、再打${where(focus[1])}`, 3);
  advice = `全員集火：先${where(focus[0])}（集火 1）再${where(focus[1])}（集火 2），打死的燈光就不會再縮`;
  const cur = () => focus.find((f) => f.alive);
  setPlan((m) => {
    const f = cur();
    return f ? posAt(POOL_ANG[m.id] + 36, 2.4, f) : null;
  }, 0.4);
  at(t + 1.5, () => bigs.forEach((e) => (e.invuln = false)));
  let doneAt = 0;
  const t0 = t;
  tick(() => {
    if (state !== 'running') return true;
    bigs.forEach((e) => {
      if (focus.includes(e) && !e.alive) return;
      setLightR(e.light, Math.max(MIN_R, e.light.r - SHRINK * dtRun));
    });
    if (player.form === 'human') {
      const wrong = bigs.find((e) => !focus.includes(e) && (e.dmg[player.id] || 0) > 1.5);
      if (wrong) {
        fail('百戲人偶·巨', [`${who(player)} 打了${where(wrong)}那隻巨人偶：大家要集火同兩隻（頭上「集火 1／2」）。`]);
        return true;
      }
    }
    if (t - t0 > 25) {
      fail('百戲人偶·巨', ['集火太慢：兩隻巨人偶沒有及時打死，燈光縮到只剩一點點。']);
      return true;
    }
    if (!cur() && !doneAt) {
      doneAt = t;
      const lazy = focus.filter((f) => !dealt(f, player));
      if (lazy.length) {
        fail('百戲人偶·巨', [`${who(player)} 沒有一起打${lazy.map(where).join('、')}的巨人偶：要跟大家集火同一隻。`]);
        return true;
      }
      // 全員點名：兩個保住的燈各站兩人，剩下一人站沒打死的小燈光
      const slots = {
        T: posAt(angOfPt(focus[0]) + 90, 1.6, focus[0].light),
        D1: posAt(angOfPt(focus[0]) - 90, 1.6, focus[0].light),
        D2: posAt(angOfPt(focus[1]) + 90, 1.6, focus[1].light),
        H: posAt(angOfPt(focus[1]) - 90, 1.6, focus[1].light),
        D3: { x: bigs[3].light.x, z: bigs[3].light.z },
      };
      bigs.forEach((e) => {
        if (!focus.includes(e) && e.alive) setEnemyHidden(e, true); // 不再需要打
        e.invuln = true;
      });
      setPlan((m) => slots[m.id], 0.2);
      setCast('千花綻放', '全員點名：分散站進光亮區域（保住的兩個燈各 2 人，第 5 人站小燈光）', 6);
      advice = '分散站進光亮區域：同一個燈的兩人站兩側（相隔 3m）';
      qianhuaMarks(t + 6);
      at(t + 6, () => {
        if (state !== 'running') return;
        if (!qianhuaJudge('百戲人偶·巨・全員點名')) return;
        cast = null;
        next();
      });
      return true; // 這個每幀檢查到此結束
    }
  });
}
