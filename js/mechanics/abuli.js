/* =====================================================================
 * 王 B：耶律阿不里
 * 核心是「狼靈劍」與「鷹靈劍」：打死狼靈／鷹靈會留下靈劍，靠近按 E 就能變身。
 *   狼：Q 格擋（窗口同卸勢），成功會朝鏡頭方向射出反擊劍氣（不會自動瞄準）；E 載起被困的隊友。
 *   鷹：飛在空中，前方長方形範圍看得到隱身狐火，Q 揭露（不要對著隊友放）。
 * 分工：狐火監牢由 輸1 變狼去救（輸1 被點名時換 輸2）；狐神舞·極 由 輸3 變鷹。
 * ===================================================================== */

/* ---------- 狼靈召喚：狼靈不會動、攻擊力會一直疊，全隊集火；坦把王拉到狼旁邊 ---------- */
function mWolf(next) {
  bossHome();
  const a = rand(360),
    p = posAt(a, 9);
  const wolf = addEnemy({ name: '狼靈', x: p.x, z: p.z, hp: 26, r: 1.2, model: wolfSpiritModel(), barY: 3.2 });
  wolf.obj.rotation.y = Math.atan2(-p.x, -p.z);
  const t0 = t,
    END = 25;
  wolf.barExtra = () => `攻+${Math.floor((t - t0) * 8)}%`;
  setCast('狼靈召喚', `狼靈在${where(p)}：攻擊力會隨時間一直提升`, 3);
  advice = player.tank ? `坦：把王拉到${where(p)}的狼靈旁邊，大家一起打` : `全隊優先集火${where(p)}的狼靈（站到它旁邊就會自動攻擊）`;
  const tankSpot = add(p, norm(sub({ x: 0, z: 0 }, p)), 3.4);
  setPlan((m) => (m.tank ? tankSpot : posAt(POOL_ANG[m.id] + a, 2.4, p)), 0.4);
  // 王跟著坦走
  tick(() => {
    if (state !== 'running') return true;
    const tk = members.find((m) => m.tank);
    if (dist(tk, bossPos) > 2.2) bossMoveTo(add(tk, norm(sub(bossPos, tk)), 1.8), 4);
    return !wolf.alive;
  });
  wolf.onDeath = () => addSword('wolf', wolf.x, wolf.z);
  tick(() => {
    if (state !== 'running') return true;
    if (!wolf.alive) {
      if (!dealt(wolf, player)) {
        fail('狼靈召喚', [`${who(player)} 沒有攻擊狼靈：狼靈攻擊力會一直疊，全隊要優先集火它。`]);
        return true;
      }
      setCast('狼靈劍', `狼靈死在${where(wolf)}，留下狼靈劍（之後的機制會用到）`, 2);
      advice = '記住狼靈劍的位置：靠近按 E 就能變身成狼';
      at(t + 2, () => {
        cast = null;
        next();
      });
      return true;
    }
    if (t - t0 > END) {
      fail('狼靈召喚', ['狼靈太久沒打死，攻擊力疊太高 → 團滅。全隊要優先集火狼靈。']);
      return true;
    }
  });
}

/* ---------- 鷹靈召喚：鷹靈對玩家射小紅圈，卸勢成功消耗氣竭值，耗盡就墜落 ---------- */
function mEagle(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  const N = 8;
  const eagle = addEnemy({ name: '鷹靈 氣竭', x: 0, z: -7, hp: N, r: 1, model: eagleSpiritModel(), barY: 1.6 });
  eagle.invuln = true;
  eagle.y = 6;
  const t0 = t;
  tick(() => {
    if (!eagle.alive) return true;
    const a = (t - t0) * 30;
    const p = posAt(a, 7);
    eagle.x = p.x;
    eagle.z = p.z;
    eagle.obj.rotation.y = ((-a + 90) * Math.PI) / 180;
    return false;
  });
  setCast('鷹靈召喚', '鷹靈會對玩家射小紅圈：每次都要卸勢，耗光氣竭值就會墜落', 3);
  advice = '散開站好；紅圈在你腳下時，白圈縮到腳下就按 F 卸勢';
  setPlan((m) => posAt(POOL_ANG[m.id], 6), 0.3);
  // 目標順序：每人輪流；「一定是我」時玩家每隔一次就被點
  let order = [];
  while (order.length < N) order = order.concat(shuffle(members));
  if (variant('targetVar', ['rand']) === 'me') order = order.map((m, i) => (i % 2 ? m : player));
  order = order.slice(0, N);
  order.forEach((tg, i) => {
    const hitT = t0 + 3.5 + i * 1.5;
    at(hitT - 1.5, () => {
      if (state !== 'running') return;
      followCircle(tg, 1.6, 0xff3030, hitT, 0.35);
      parryCue(tg, hitT);
    });
    at(hitT, () => {
      if (state !== 'running') return;
      boom(tg, 1.6, 0xff5050);
      const reasons = [];
      if (!parried(tg, hitT)) reasons.push(`${who(tg)} 沒有卸勢（F）：被鷹靈紅圈命中，也沒消耗到鷹靈的氣竭值。`);
      members.forEach((m) => {
        if (m !== tg && dist(m, tg) < 1.6 && !invuln(m)) reasons.push(`${who(m)} 站在 ${who(tg)} 的紅圈裡被波及：大家散開。`);
      });
      if (reasons.length) return fail('鷹靈召喚', reasons);
      eagle.hp -= 1;
      if (i === N - 1) {
        // 墜落 → 留下鷹靈劍
        const fall = posAt(angOfPt(eagle) + 10, 9);
        killEnemy(eagle);
        addSword('eagle', fall.x, fall.z);
        setCast('鷹靈劍', `鷹靈墜落在${where(fall)}，留下鷹靈劍`, 2);
        advice = '記住鷹靈劍的位置：靠近按 E 就能變身成鷹';
        at(t + 2, () => {
          cast = null;
          next();
        });
      }
    });
  });
}

/* ---------- 狼神附身＋狼神鼓：王開高額護盾，4 擊鼓（第 4 擊致命），全員變狼格擋反擊破盾 ---------- */
function mDrum(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  const sw = ensureSword('wolf');
  bossBParts.shield.visible = true;
  let shield = 15;
  const t0 = t;
  setCast('狼神附身', '王獲得高額護盾：全員到狼靈劍按 E 變狼', 5);
  advice = `去${where(sw)}的狼靈劍按 E 變身成狼，然後面向王（拖曳鏡頭對準）`;
  members.forEach((m) => (m.wantForm = 'wolf'));
  const toBoss = norm(sub(bossPos, sw));
  const baseA = angOfPt(sw, bossPos);
  setPlan((m) => {
    if (m.form !== 'wolf') return posAt(POOL_ANG[m.id], 1.0, sw);
    m.aim = norm(sub(bossPos, m));
    return posAt(baseA + (POOL_ANG[m.id] > 180 ? POOL_ANG[m.id] - 360 : POOL_ANG[m.id]) * 0.35, 7, bossPos);
  }, 0.3);
  const beats = [6, 8.6, 11.2].map((k) => t0 + k);
  beats.forEach((h, i) => {
    at(h - 1.6, () => {
      if (state !== 'running') return;
      setCast('狼神鼓', `第 ${i + 1} 擊（第 4 擊致命）：狼的 Q 卸勢王的紅圈傷害，反擊劍氣打護盾；腳下金光不必躲`, 1.6);
      advice = '白圈縮到腳下時按 Q 格擋（狼形）；劍氣朝鏡頭方向射出，先對準王';
    });
    members.forEach((m) => parryCue(m, h, 0xffb070));
    // 期間腳下出現的金光傷害：攻略說不必躲避（只是視覺）
    at(h - 1.0, () => {
      if (state !== 'running') return;
      for (let k = 0; k < 5; k++) {
        const p = posAt(rand(360), 2 + Math.random() * 10);
        addFx(circleMesh(p.x, p.z, 1.4, 0xffd36a, 0.35), 1.0);
      }
    });
    at(h, () => {
      if (state !== 'running') return;
      const wave = ringMesh(bossPos.x, bossPos.z, 0.5, 15, 0xff8a3a, 0.35);
      addFx(wave, 0.6);
      const reasons = [];
      members.forEach((m) => {
        if (m.form !== 'wolf')
          return reasons.push(`${who(m)} 沒有變身成狼：人形擋不住狼神鼓（第 4 擊會致命）。到${where(sw)}的狼靈劍按 E。`);
        if (!parried(m, h)) return reasons.push(`${who(m)} 沒按 Q 格擋第 ${i + 1} 擊（白圈縮到腳下時按）。`);
        const d = aimDir(m);
        addFx(lineMesh({ x: m.x, z: m.z }, d, 18, 0.4, 0x9fd0ff, 0.8), 0.5);
        if (!inLine(bossPos, m, d, 18, 1.8))
          return reasons.push(`${who(m)} 的反擊劍氣沒打中王：劍氣不會自動瞄準，發射前拖曳鏡頭讓王在畫面正前方。`);
        shield -= 1;
      });
      if (reasons.length) return fail('狼神鼓', reasons);
      if (i === 2) {
        bossBParts.shield.visible = false;
        boom(bossPos, 2.5, 0xffd0a0);
        setCast('破盾', '護盾被打破，第 4 擊不會出來', 1.5);
        at(t + 1.5, () => {
          cast = null;
          next();
        });
      }
    });
  });
}

/* ---------- 狐火監牢：點名一人沉默＋腳下監牢，隊友變狼把他載出來 ---------- */
function mCage(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  const sw = ensureSword('wolf');
  const tg = pickTarget();
  const rescuer = tg.id === 'D1' ? byId('D2') : byId('D1');
  const t0 = t;
  setTag(tg, '狐火監牢', '#ff9a4a');
  setCast('狐火監牢', `點名 ${who(tg)}：沉默，4 秒後腳下出現監牢；${who(rescuer)} 變狼去救`, 4);
  advice =
    tg === player
      ? `你被點名：先離開狼靈劍（${where(sw)}）遠一點再被關，等 ${who(rescuer)} 變狼來載你`
      : rescuer === player
        ? `你負責救人：去${where(sw)}的狼靈劍按 E 變狼，跑到 ${who(tg)} 身邊按 E 載起來，帶出監牢`
        : `站在王旁邊，不要靠近 ${who(tg)}（監牢會把旁邊的人一起關）`;
  rescuer.wantForm = 'wolf';
  const away = posAt(angOfPt(sw) + 180, 8);
  let cage = null;
  setPlan((m) => {
    if (m === tg) return m.trapped ? null : away;
    if (m === rescuer) {
      if (m.form !== 'wolf') return posAt(0, 0.8, sw);
      if (!cage) return add(away, norm(sub(sw, away)), 4.5);
      if (!m.carrying) return { x: tg.x, z: tg.z };
      return add(cage, norm(sub({ x: 0, z: 0 }, cage)), cage.r + 3);
    }
    return posAt(POOL_ANG[m.id], 3, bossPos);
  }, 0.3);
  at(t0 + 4, () => {
    if (state !== 'running') return;
    cage = { x: tg.x, z: tg.z, r: 2.4 };
    const g = new T.Group();
    g.add(circleMesh(0, 0, cage.r, 0xff7a2a, 0.3, 0.08), ringMesh(0, 0, cage.r - 0.25, cage.r, 0xffb04a, 0.95, 0.09));
    const bars = new T.Mesh(
      new T.CylinderGeometry(cage.r, cage.r, 3, 24, 1, true),
      new T.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false }),
    );
    bars.position.y = 1.5;
    g.add(bars);
    g.position.set(cage.x, 0, cage.z);
    omen(g, 30);
    tg.trapped = cage;
    setTag(tg, '被困住', '#ff9a4a');
    const reasons = [];
    if (dist(sw, cage) < cage.r + 0.4) {
      sw.caged = true;
      reasons.push(`${who(tg)} 站在狼靈劍旁邊被關：狼靈劍被一起困住，沒有人能變狼來救。被點名要先離開狼靈劍。`);
    }
    members.forEach((m) => {
      if (m !== tg && dist(m, cage) < cage.r)
        reasons.push(`${who(m)} 和 ${who(tg)} 距離 ${dist(m, cage).toFixed(1)}m，被監牢一起關住：被點名的人要離開人群（也遠離狼靈劍）。`);
    });
    if (reasons.length) return fail('狐火監牢', reasons);
    setCast('狐火監牢', `${who(tg)} 被困住：持續受傷，10 秒內要被狼載出去`, 10);
    // NPC 救援者：靠近就按 E 載人
    tick(() => {
      if (state !== 'running') return true;
      if ((!rescuer.isPlayer || autoOn()) && rescuer.form === 'wolf' && !rescuer.carrying && dist(rescuer, tg) < 1.6)
        pressInteract(rescuer);
      if (tg.carriedBy && dist(tg.carriedBy, cage) > cage.r + 0.8) {
        tg.trapped = null;
        tg.carriedBy.carrying = null;
        tg.carriedBy = null;
        setTag(tg, '');
        setCast('救出', `${who(tg)} 被載出監牢了`, 1.5);
        at(t + 1.5, () => {
          cast = null;
          next();
        });
        return true;
      }
      if (t - t0 > 14) {
        fail('狐火監牢', [
          `${who(tg)} 沒在 10 秒內被救出 → 致命傷害。`,
          `負責救人的是 ${who(rescuer)}：到狼靈劍按 E 變狼 → 跑到被困的人旁邊按 E 載起來 → 帶出監牢圈。`,
        ]);
        return true;
      }
    });
  });
}

/* ---------- 狐神舞：王無敵，召喚 2 團狐火，打掉就解除 ---------- */
function mFox(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  bossBParts.shield.visible = true;
  const a = rand(180);
  const fires = [a + 90, a + 270].map((ang) => {
    const p = posAt(ang, 9);
    return addEnemy({ name: '狐火', x: p.x, z: p.z, hp: 14, r: 0.7, model: foxfireModel(), barY: 3.2 });
  });
  const grp = { T: 0, D1: 0, D2: 1, D3: 1 };
  const t0 = t,
    END = 20;
  setCast('狐神舞', '王無敵（狐火護盾）：打掉 2 團狐火才能解除', END);
  const mine = grp[player.id];
  advice =
    mine === undefined
      ? '補師：站在中間補血就好（不用打王，王無敵）'
      : `打${where(fires[mine])}那團狐火（坦＋輸1 一團、輸2＋輸3 一團），不用打王`;
  fires.forEach((f, k) => {
    const l = makeLabel(k === 0 ? '坦・輸1' : '輸2・輸3', '#9ee8ff');
    l.position.y = 4.0;
    l.scale.multiplyScalar(0.8);
    f.obj.add(l);
  });
  setPlan((m) => {
    const k = grp[m.id];
    if (k === undefined) return posAt(180, 2);
    return posAt(m.id === 'T' || m.id === 'D2' ? -50 : 50, 2.2, fires[k]);
  }, 0.3);
  tick(() => {
    if (state !== 'running') return true;
    if (cast) cast.sub = `剩 ${alive(fires).length} 團狐火（王無敵中）`;
    if (!alive(fires).length) {
      if (mine !== undefined && !dealt(fires[mine], player)) {
        fail('狐神舞', [`${who(player)} 沒有打自己那一組的狐火（${where(fires[mine])}）：王無敵時要去打狐火，不用打王。`]);
        return true;
      }
      bossBParts.shield.visible = false;
      setCast('解除無敵', '狐火全滅，王的護盾解除', 1.5);
      at(t + 1.5, () => {
        cast = null;
        next();
      });
      return true;
    }
    if (t - t0 > END) {
      fail('狐神舞', [`狐火太久沒打完（還剩 ${alive(fires).length} 團）：分兩組各打一團。`]);
      return true;
    }
  });
}

/* ---------- 狐神舞·極：4 團狐火、2 秒後隱身；輸3 變鷹揭露，其他人打 ---------- */
function mFoxEx(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  const sw = ensureSword('eagle');
  bossBParts.shield.visible = true;
  const eagleM = byId('D3');
  eagleM.wantForm = 'eagle';
  const base = rand(90);
  const fires = [0, 1, 2, 3].map((k) => {
    const p = posAt(base + k * 90 + (Math.random() * 36 - 18), 9 + Math.random() * 4);
    const f = addEnemy({ name: '狐火', x: p.x, z: p.z, hp: 8, r: 0.7, model: foxfireModel(), barY: 3.2 });
    f.revealedAt = 0;
    return f;
  });
  const t0 = t,
    END = 50;
  setCast('狐神舞·極', '4 團狐火，約 2 秒後隱身：輸3 變鷹揭露，其他人打', END);
  advice =
    eagleM === player
      ? `你當鷹：去${where(sw)}的鷹靈劍按 E 變鷹，飛到狐火外側、面向狐火（拖曳鏡頭）按 Q 揭露，別對著隊友`
      : '先記住 4 團狐火的位置；隱身後在王旁邊等鷹（輸3）揭露，揭露出來就去打';
  at(t0 + 2, () => fires.forEach((f) => f.alive && !f.revealedAt && setEnemyHidden(f, true)));
  const revealed = () => fires.filter((f) => f.alive && f.revealedAt).sort((a, b) => a.revealedAt - b.revealedAt);
  skillHook.reveal = (m, d) => {
    const hitMates = members.filter((o) => o !== m && o.form !== 'eagle' && inLine(o, m, d, EAGLE_LEN, EAGLE_HW));
    if (hitMates.length)
      return fail('狐神舞·極', [`${who(m)} 的鷹技能打到隊友 ${hitMates.map(who).join('、')}：放之前確認前方長方形裡沒有人。`]);
    fires.forEach((f) => {
      if (f.alive && f.hidden && inLine(f, m, d, EAGLE_LEN, EAGLE_HW + f.r)) {
        setEnemyHidden(f, false);
        f.revealedAt = t;
      }
    });
  };
  setPlan((m) => {
    if (m === eagleM) {
      if (m.form !== 'eagle') return posAt(0, 0.8, sw);
      const f = fires.find((e) => e.alive && e.hidden);
      if (!f) return posAt(0, 2);
      const spot = add(f, norm(f), 3.2);
      m.aim = norm(sub(f, spot));
      return spot;
    }
    const f = revealed()[0];
    if (f) return posAt(POOL_ANG[m.id], 2.0, f);
    return posAt(POOL_ANG[m.id], 1.6);
  }, 0.3);
  tick(() => {
    if (state !== 'running') return true;
    // NPC 鷹：到位就放揭露
    if ((!eagleM.isPlayer || autoOn()) && eagleM.form === 'eagle') {
      const f = fires.find((e) => e.alive && e.hidden);
      if (f && dist(eagleM, add(f, norm(f), 3.2)) < 0.4) pressSkill(eagleM);
    }
    // 玩家是鷹時：前方範圍內的隱身狐火看得到
    fires.forEach((f) => {
      if (!f.alive || !f.hidden) return;
      f.obj.visible = player.form === 'eagle' && inLine(f, player, aimDir(player), EAGLE_LEN + 4, EAGLE_HW + 1.5);
    });
    if (cast) cast.sub = `剩 ${alive(fires).length}／4 團狐火（隱身 ${fires.filter((f) => f.alive && f.hidden).length}）`;
    if (!alive(fires).length) {
      if (player !== eagleM && !fires.some((f) => dealt(f, player))) {
        fail('狐神舞·極', [`${who(player)} 沒有攻擊狐火：鷹揭露之後要馬上去打。`]);
        return true;
      }
      bossBParts.shield.visible = false;
      skillHook = {};
      setCast('解除無敵', '狐火全滅，王的護盾解除', 1.5);
      at(t + 1.5, () => {
        cast = null;
        next();
      });
      return true;
    }
    if (t - t0 > END) {
      fail('狐神舞·極', [
        `時間到還剩 ${alive(fires).length} 團狐火。`,
        eagleM === player ? '你當鷹：飛到狐火外側、面向狐火按 Q 揭露（前方長方形範圍）。' : '鷹揭露後要馬上去打。',
      ]);
      return true;
    }
  });
}

/* ---------- 狐火爆炎：點名發射狐火，地上留下持續傷害的火焰，帶到場邊 ---------- */
function mBlaze(next) {
  bossMoveTo({ x: 0, z: 0 }, 6);
  const a = pickTarget(),
    rest = shuffle(members.filter((m) => m !== a));
  const order = [a, rest[0], rest[1]],
    t0 = t;
  const status = new Map(); // 誰被點名、鎖定位置
  let done = false;
  setCast('狐火爆炎', '點名發射狐火：帶到場地邊緣，鎖定後馬上離開', 3);
  advice = '大家在王旁邊；被點名的人跑到場邊（外圈），出現藍色圈就離開';
  setPlan((m) => {
    const s = status.get(m);
    if (s === 'mark') return posAt(POOL_ANG[m.id], 15.5);
    if (s === 'lock') return posAt(POOL_ANG[m.id], 10.5);
    return posAt(POOL_ANG[m.id], 3, bossPos);
  }, 0.2);
  // 踩到火焰
  const stand = new Map();
  tick(() => {
    if (state !== 'running') return true;
    members.forEach((m) => {
      const on = puddles.some((p) => dist(m, p) < p.r - 0.3);
      stand.set(m, on ? (stand.get(m) || 0) + dtRun : 0);
      if (stand.get(m) > 0.8)
        fail('狐火爆炎', [`${who(m)} 踩在狐火留下的火焰上（${where(m)}）：火焰會持續造成傷害，不要站在裡面。`]);
    });
    return done;
  });
  order.forEach((tg, i) => {
    const hitT = t0 + 5 + i * 5.5;
    let lock = null;
    at(hitT - 5, () => {
      if (state !== 'running') return;
      status.set(tg, 'mark');
      setTag(tg, '狐火爆炎', '#7ad0ff');
      setCast('狐火爆炎', `點名 ${who(tg)}：把狐火帶到場邊`, 5);
      if (tg === player) advice = '你被點名：跑到場地邊緣（外圈），藍色圈出現後馬上走出來或閃避';
      members.forEach((m) => (m.reactAt = t + 0.2));
    });
    at(hitT - 1.0, () => {
      if (state !== 'running') return;
      lock = { x: tg.x, z: tg.z };
      status.set(tg, 'lock');
      members.forEach((m) => (m.reactAt = t + 0.15));
      omen(circleMesh(lock.x, lock.z, 3, 0x3aa8ff, 0.45), 1.0);
      omen(ringMesh(lock.x, lock.z, 2.8, 3, 0x9ee8ff, 0.95), 1.0);
    });
    at(hitT, () => {
      if (state !== 'running') return;
      status.delete(tg);
      setTag(tg, '');
      boom(lock, 3, 0x7ad0ff);
      const reasons = [];
      members.forEach((m) => {
        if (dist(m, lock) < 3 && !invuln(m)) reasons.push(`${who(m)} 在狐火落點（藍色圈）裡被炸到：鎖定後要馬上走出來或按空白鍵閃避。`);
      });
      if (Math.hypot(lock.x, lock.z) < 11)
        reasons.push(`${who(tg)} 把狐火留在離中心 ${Math.hypot(lock.x, lock.z).toFixed(1)}m（${where(lock)}）：火焰會留在隊伍附近，要帶到場地邊緣（11m 以外）。`);
      if (reasons.length) return fail('狐火爆炎', reasons);
      addPuddle(lock.x, lock.z, 3);
      if (i === 2)
        at(t + 1.2, () => {
          done = true;
          cast = null;
          next();
        });
    });
  });
}
