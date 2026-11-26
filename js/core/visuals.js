/* =====================================================================
 * 共用視覺：文字標籤、地面範圍（圓／環／扇／矩形／直線）、暫時性特效
 * renderOrder：地板 1–2、一般特效 5、預兆 8
 * ===================================================================== */

const labelCache = {};
function labelTex(text, color) {
  const key = text + color;
  if (labelCache[key]) return labelCache[key];
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const g = cv.getContext('2d');
  let fs = 46;
  g.font = `700 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
  // 字多時自動縮小，避免被裁掉
  while (fs > 18 && g.measureText(text).width > 236) {
    fs -= 2;
    g.font = `700 ${fs}px "Noto Sans TC",system-ui,sans-serif`;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(10,5,10,.9)';
  g.strokeText(text, 128, 50);
  g.fillStyle = color;
  g.fillText(text, 128, 50);
  return (labelCache[key] = canvasTex(cv));
}
function makeLabel(text, color) {
  const s = new T.Sprite(
    new T.SpriteMaterial({ map: labelTex(text, color), transparent: true, depthWrite: false }),
  );
  s.scale.set(1.9, 0.71, 1);
  return s;
}

// 暫時性特效：{obj, until, fade, born}
let fx = [];
function addFx(obj, life, fade = true) {
  if (!obj.renderOrder) obj.renderOrder = 5;
  obj.traverse((o) => {
    if (o !== obj && !o.renderOrder) o.renderOrder = obj.renderOrder;
  });
  scene.add(obj);
  fx.push({ obj, born: t, until: t + life, fade, op0: obj.material ? obj.material.opacity : 1 });
  return obj;
}
function removeFx(obj) {
  scene.remove(obj);
  fx = fx.filter((f) => f.obj !== obj);
}
// 預兆（讀條開始就顯示，判定時移除）
function omen(obj, life) {
  obj.renderOrder = 8;
  return addFx(obj, life, false);
}
// 判定瞬間的特效：加亮混色並淡出
function strongFlash(mesh) {
  mesh.traverse((o) => {
    if (o.material) {
      o.material = o.material.clone();
      o.material.blending = T.AdditiveBlending;
      o.material.opacity = Math.min(1, (o.material.opacity || 0.5) + 0.35);
    }
  });
  if (mesh.children.length && mesh.children[0].material) mesh.material = mesh.children[0].material;
  mesh.renderOrder = 9;
  addFx(mesh, 0.9);
}
function clearFx() {
  fx.forEach((f) => scene.remove(f.obj));
  fx = [];
}
// 地面範圍只畫在場地內（用模板緩衝：地板寫入 1，範圍只在 1 的地方顯示）
function groundMat(color, op) {
  return new T.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: op,
    depthWrite: false,
    side: T.DoubleSide,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: T.EqualStencilFunc,
    stencilFail: T.KeepStencilOp,
    stencilZFail: T.KeepStencilOp,
    stencilZPass: T.KeepStencilOp,
  });
}
function circleMesh(x, z, r, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(new T.CircleGeometry(r, 48).rotateX(-Math.PI / 2), groundMat(color, op));
  m.position.set(x, y, z);
  return m;
}
function ringMesh(x, z, r0, r1, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(new T.RingGeometry(r0, r1, 64).rotateX(-Math.PI / 2), groundMat(color, op));
  m.position.set(x, y, z);
  return m;
}
// 扇形：頂點 o、朝向角 a（度，由北順時針）、半角 half（度）
function coneMesh(o, a, half, len, color, op = 0.5, y = 0.08) {
  const h = (half * Math.PI) / 180;
  const m = new T.Mesh(new T.CircleGeometry(len, 32, -h, h * 2).rotateX(-Math.PI / 2), groundMat(color, op));
  const d = dirOf(a);
  m.position.set(o.x, y, o.z);
  m.rotation.y = Math.atan2(-d.z, d.x);
  return m;
}
// 軸對齊矩形
function rectMesh(x0, x1, z0, z1, color, op = 0.45, y = 0.07) {
  const m = new T.Mesh(
    new T.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).rotateX(-Math.PI / 2),
    groundMat(color, op),
  );
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  return m;
}
// 直線：起點 o、方向 d、長 len、半寬 hw（外框加亮邊）
function lineMesh(o, d, len, hw, color, op = 0.45, y = 0.08) {
  const g = new T.Group();
  const fill = new T.Mesh(new T.PlaneGeometry(hw * 2, len).rotateX(-Math.PI / 2), groundMat(color, op));
  fill.position.z = len / 2;
  const e1 = new T.Mesh(new T.PlaneGeometry(0.12, len).rotateX(-Math.PI / 2), groundMat(color, 0.95));
  e1.position.set(hw, 0.005, len / 2);
  const e2 = e1.clone();
  e2.position.x = -hw;
  g.add(fill, e1, e2);
  g.position.set(o.x, y, o.z);
  g.rotation.y = Math.atan2(d.x, d.z);
  g.material = fill.material;
  return g;
}

/* ---------- 頭上文字立牌 ---------- */
function floatLabel(text, color, x, z, y = 2.2, s = 1) {
  const l = makeLabel(text, color);
  l.position.set(x, y, z);
  l.scale.multiplyScalar(s);
  return l;
}

/* ---------- 血條（小怪頭上） ---------- */
function makeBar(name) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const tex = canvasTex(cv);
  const s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(2.6, 0.65, 1);
  s.renderOrder = 12;
  s.userData = { cv, tex, name, last: -1 };
  return s;
}
function drawBar(s, k, extra) {
  const u = s.userData,
    key = Math.round(k * 40) + (extra || '');
  if (u.last === key) return;
  u.last = key;
  const g = u.cv.getContext('2d');
  g.clearRect(0, 0, 256, 64);
  g.font = '700 26px "Noto Sans TC",system-ui,sans-serif';
  g.textAlign = 'center';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(10,5,10,.9)';
  const txt = u.name + (extra ? ' ' + extra : '');
  g.strokeText(txt, 128, 26);
  g.fillStyle = '#fff';
  g.fillText(txt, 128, 26);
  g.fillStyle = 'rgba(0,0,0,.7)';
  g.fillRect(28, 38, 200, 16);
  g.fillStyle = '#e0565b';
  g.fillRect(30, 40, 196 * Math.max(0, k), 12);
  u.tex.needsUpdate = true;
}

function screenFlash() {
  const f = $('flash');
  f.style.opacity = 1;
  setTimeout(() => (f.style.opacity = 0), 350);
}
