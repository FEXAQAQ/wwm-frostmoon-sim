/* =====================================================================
 * 場景：渲染器、相機、燈光、圓形地板（兩種：金色舞台／夜晚花海）、熄燈黑幕、兩隻王的模型
 * 王 A：桃靨劍姬（粉衣劍客，會飛到空中）
 * 王 B：耶律阿不里（披毛皮的戰士，狼神附身時會發紅光、有護盾）
 * ===================================================================== */

let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true, stencil: true });
} catch (e) {
  window.__fatal('無法建立 WebGL，請開啟瀏覽器硬體加速。');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);

const scene = new T.Scene();
scene.background = new T.Color(0x14101a);
scene.fog = new T.Fog(0x14101a, 40, 95);
const camera = new T.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 200);
const hemi = new T.HemisphereLight(0xfff2dd, 0x2a1c22, 0.95);
scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0dc, 1.35);
sun.position.set(-12, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
scene.add(sun);

function canvasTex(cv) {
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- 地板 A：金色雕花圓形舞台 ---------- */
function stageTexture() {
  const W = 1024,
    k = W / (ARENA_R * 2),
    cv = document.createElement('canvas');
  cv.width = cv.height = W;
  const g = cv.getContext('2d');
  const bg = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.55);
  bg.addColorStop(0, '#c98a4a');
  bg.addColorStop(1, '#8a4f2a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, W);
  g.translate(W / 2, W / 2);
  // 雲紋：一圈一圈的金色弧線
  g.strokeStyle = 'rgba(255,214,140,.55)';
  g.lineWidth = 5;
  for (let ring = 0; ring < 3; ring++) {
    const r = (5 + ring * 5) * k;
    for (let i = 0; i < 12 + ring * 6; i++) {
      const a = (i / (12 + ring * 6)) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.cos(a) * r, Math.sin(a) * r, 1.2 * k, a, a + Math.PI * 1.3);
      g.stroke();
    }
  }
  g.strokeStyle = 'rgba(255,230,170,.7)';
  g.lineWidth = 8;
  [4, 10, 16.5].forEach((r) => {
    g.beginPath();
    g.arc(0, 0, r * k, 0, 7);
    g.stroke();
  });
  // 淡淡的十字輔助線
  g.strokeStyle = 'rgba(255,240,210,.12)';
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    g.beginPath();
    g.moveTo(-Math.cos(a) * ARENA_R * k, -Math.sin(a) * ARENA_R * k);
    g.lineTo(Math.cos(a) * ARENA_R * k, Math.sin(a) * ARENA_R * k);
    g.stroke();
  }
  return canvasTex(cv);
}
/* ---------- 地板 B：夜晚的花海草原 ---------- */
function fieldTexture() {
  const W = 1024,
    cv = document.createElement('canvas');
  cv.width = cv.height = W;
  const g = cv.getContext('2d');
  g.fillStyle = '#2c3350';
  g.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) {
    const r = Math.random();
    g.fillStyle =
      r < 0.12 ? `rgba(220,60,70,${0.4 + Math.random() * 0.4})` : `rgba(${120 + rand(60)},${130 + rand(60)},${190},${Math.random() * 0.25})`;
    const s = r < 0.12 ? 3 + Math.random() * 3 : 2 + Math.random() * 5;
    g.fillRect(Math.random() * W, Math.random() * W, s, s);
  }
  g.strokeStyle = 'rgba(220,230,255,.10)';
  g.lineWidth = 2;
  [7 / 18, 14 / 18].forEach((r) => {
    g.beginPath();
    g.arc(W / 2, W / 2, (r * W) / 2, 0, 7);
    g.stroke();
  });
  return canvasTex(cv);
}
const FLOOR_TEX = { A: stageTexture(), B: fieldTexture() };
const floor = new T.Mesh(
  new T.CircleGeometry(ARENA_R, 96).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({
    map: FLOOR_TEX.A,
    roughness: 0.9,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: T.AlwaysStencilFunc,
    stencilZPass: T.ReplaceStencilOp,
  }),
);
floor.receiveShadow = true;
floor.renderOrder = -1;
scene.add(floor);
const outside = new T.Mesh(
  new T.PlaneGeometry(220, 220).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({ color: 0x1d1820, roughness: 1 }),
);
outside.position.y = -0.4;
scene.add(outside);
const rim = new T.Mesh(
  new T.TorusGeometry(ARENA_R + 1.2, 1.0, 8, 96).rotateX(Math.PI / 2),
  new T.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.7, metalness: 0.3 }),
);
rim.scale.y = 0.35;
rim.position.y = 0.1;
scene.add(rim);
{
  const edge = new T.Mesh(
    new T.RingGeometry(ARENA_R - 0.12, ARENA_R + 0.05, 128).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  edge.position.y = 0.05;
  edge.renderOrder = 2;
  scene.add(edge);
}
// 熄燈時蓋在地板上的黑幕
const darkVeil = new T.Mesh(
  new T.CircleGeometry(ARENA_R + 0.2, 96).rotateX(-Math.PI / 2),
  new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false }),
);
darkVeil.position.y = 0.03;
darkVeil.renderOrder = 1;
darkVeil.visible = false;
scene.add(darkVeil);

/* ---------- 王 A：桃靨劍姬 ---------- */
const bossA = new T.Group();
const bossAParts = {};
{
  const robe = new T.MeshStandardMaterial({ color: 0xf2a6c0, roughness: 0.6 });
  const white = new T.MeshStandardMaterial({ color: 0xf8eef0, roughness: 0.5 });
  const skirt = new T.Mesh(new T.ConeGeometry(1.1, 2.2, 20), robe);
  skirt.position.y = 1.1;
  const body = new T.Mesh(new T.CylinderGeometry(0.38, 0.5, 1.3, 14), white);
  body.position.y = 2.6;
  const head = new T.Mesh(new T.SphereGeometry(0.36, 16, 12), white);
  head.position.y = 3.55;
  const hair = new T.Mesh(new T.SphereGeometry(0.42, 16, 12, 0, 7, 0, 1.6), new T.MeshStandardMaterial({ color: 0x2a1820 }));
  hair.position.y = 3.62;
  const sword = new T.Mesh(
    new T.BoxGeometry(0.08, 2.4, 0.18),
    new T.MeshStandardMaterial({ color: 0xdfe8ff, emissive: 0xff7ab0, emissiveIntensity: 0.6, metalness: 0.8 }),
  );
  sword.position.set(0.8, 2.6, 0.4);
  sword.rotation.z = -0.5;
  // 飄帶
  const ribbon = new T.Mesh(
    new T.TorusGeometry(1.3, 0.06, 6, 40, Math.PI * 1.4),
    new T.MeshStandardMaterial({ color: 0xff9ec4, emissive: 0xff6aa0, emissiveIntensity: 0.4 }),
  );
  ribbon.position.y = 2.7;
  ribbon.rotation.x = Math.PI / 2;
  [skirt, body, head, sword].forEach((o) => (o.castShadow = true));
  bossA.add(skirt, body, head, hair, sword, ribbon);
  bossAParts.sword = sword;
  bossAParts.ribbon = ribbon;
}
/* ---------- 王 B：耶律阿不里 ---------- */
const bossB = new T.Group();
const bossBParts = {};
{
  const fur = new T.MeshStandardMaterial({ color: 0x8b7a66, roughness: 0.9 });
  const armor = new T.MeshStandardMaterial({ color: 0x3a3e4a, roughness: 0.5, metalness: 0.4 });
  const legs = new T.Mesh(new T.CylinderGeometry(0.55, 0.7, 1.6, 12), armor);
  legs.position.y = 0.8;
  const body = new T.Mesh(new T.CylinderGeometry(0.75, 0.6, 1.6, 12), armor);
  body.position.y = 2.4;
  const cape = new T.Mesh(new T.SphereGeometry(1.0, 14, 10, 0, 7, 0, 1.4), fur);
  cape.position.y = 3.0;
  const head = new T.Mesh(new T.SphereGeometry(0.4, 14, 10), new T.MeshStandardMaterial({ color: 0xd8b89a }));
  head.position.y = 3.6;
  const hat = new T.Mesh(new T.ConeGeometry(0.55, 0.7, 12), fur);
  hat.position.y = 4.1;
  const blade = new T.Mesh(new T.BoxGeometry(0.15, 2.6, 0.4), new T.MeshStandardMaterial({ color: 0xc8ccd8, metalness: 0.8 }));
  blade.position.set(1.0, 2.4, 0.5);
  blade.rotation.z = -0.3;
  [legs, body, cape, head, blade].forEach((o) => (o.castShadow = true));
  bossB.add(legs, body, cape, head, hat, blade);
  // 護盾（狼神附身／狐神舞）
  const shield = new T.Mesh(
    new T.SphereGeometry(2.0, 24, 16),
    new T.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.25, depthWrite: false }),
  );
  shield.position.y = 2.0;
  shield.visible = false;
  bossB.add(shield);
  bossBParts.shield = shield;
}
[bossA, bossB].forEach((b) => {
  const tr = new T.Mesh(
    new T.RingGeometry(1.6, 1.85, 48).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  tr.position.y = 0.06;
  tr.renderOrder = 3;
  b.add(tr);
  b.userData.ring = tr;
  scene.add(b);
});

// 目前的王與場地
let bossKey = 'A',
  boss = bossA;
const bossPos = { x: 0, z: 0, y: 0 };
function setBossScene(k) {
  bossKey = k;
  boss = k === 'A' ? bossA : bossB;
  bossA.visible = k === 'A';
  bossB.visible = k === 'B';
  floor.material.map = FLOOR_TEX[k];
  floor.material.needsUpdate = true;
  rim.material.color.setHex(k === 'A' ? 0x8a6a3a : 0x3c4258);
  scene.background.setHex(k === 'A' ? 0x14101a : 0x0e1220);
  scene.fog.color.setHex(k === 'A' ? 0x14101a : 0x0e1220);
}
function bossHome() {
  bossPos.x = 0;
  bossPos.z = 0;
  bossPos.y = 0;
  bossB.userData.shield = false;
  bossBParts.shield.visible = false;
}
