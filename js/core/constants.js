/* =====================================================================
 * 常數、職能、站位與幾何小工具
 * 座標：x 往東為正、z 往南為正（北 = -z）。圓形場地半徑 ARENA_R。
 * 角度一律「由北起順時針」的度數。
 * 隊伍：1 坦（T）、1 奶（H）、3 輸出（D1–D3），共 5 人。
 * ===================================================================== */

const $ = (id) => document.getElementById(id);
const T = THREE;

const ARENA_R = 18, // 圓形場地半徑
  WALK_R = 17.4, // 可走半徑
  SPEED = 6, // 人形移動速度
  ATK_R = 3.6, // 普攻距離（從目標邊緣算）
  CLEAVE_R = 2.6; // 普攻順劈：打到目標周圍這麼近的其他小怪

const ROLE_INFO = {
  T: { label: '坦', col: 0x4f8dff, tank: 1 },
  H: { label: '奶', col: 0x47c27a, healer: 1 },
  D1: { label: '輸1', col: 0xe0565b },
  D2: { label: '輸2', col: 0xe0565b },
  D3: { label: '輸3', col: 0xe0565b },
};
const ROLE_IDS = Object.keys(ROLE_INFO);
const ROLE_FULL = { T: '坦克', H: '補師', D1: '輸出 1', D2: '輸出 2', D3: '輸出 3' };

// 每人固定的「燈位」角度（熄燈時五個燈光的位置，各站一個）
const POOL_ANG = { T: 0, D1: 72, D2: 144, D3: 216, H: 288 };
const POOL_R = 10, // 燈光離中心距離
  LIGHT_R = 2.6; // 燈光半徑

// 開場站位：王在中央，大家圍在南側
const IDLE = {
  T: { x: 0, z: -2.5 },
  H: { x: 0, z: 7 },
  D1: { x: -3, z: 3 },
  D2: { x: 3, z: 3 },
  D3: { x: 0, z: 4.2 },
};

const P = (x, z) => ({ x, z });
const dirOf = (a) => {
  const r = (a * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
};
const posAt = (a, r, c = { x: 0, z: 0 }) => {
  const d = dirOf(a);
  return { x: c.x + d.x * r, z: c.z + d.z * r };
};
const angOfPt = (p, c = { x: 0, z: 0 }) => {
  const a = (Math.atan2(p.x - c.x, -(p.z - c.z)) * 180) / Math.PI;
  return (a + 360) % 360;
};
const angDiff = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const who = (m) => (m.isPlayer ? ROLE_INFO[m.id].label + '（你）' : ROLE_INFO[m.id].label);
const dot = (a, b) => a.x * b.x + a.z * b.z;
const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, z: a.z + b.z * k });
const norm = (v) => {
  const l = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / l, z: v.z / l };
};
const lerpP = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k });

// 方位文字（給失敗訊息用）
function where(p) {
  if (Math.hypot(p.x, p.z) < 4) return '中央';
  const names = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  return names[Math.round(angOfPt(p) / 45) % 8];
}

/* ---------- 幾何判定 ---------- */
// 線段型（矩形）範圍：起點 o、方向 d（單位向量）、長 len、半寬 hw
function inLine(p, o, d, len, hw) {
  const vx = p.x - o.x,
    vz = p.z - o.z;
  const along = vx * d.x + vz * d.z;
  const side = Math.abs(vx * -d.z + vz * d.x);
  return along >= -0.3 && along <= len && side <= hw;
}
