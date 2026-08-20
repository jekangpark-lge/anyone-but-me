export interface Vec2 {
  x: number;
  y: number;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(a: Vec2): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len === 0) return { x: 0, y: 0 };
  return scale(a, 1 / len);
}

export function fromAngle(angleRad: number): Vec2 {
  return { x: Math.cos(angleRad), y: Math.sin(angleRad) };
}

// v를 법선 n(단위 벡터) 기준으로 반사한다(입사각=반사각).
export function reflect(v: Vec2, n: Vec2): Vec2 {
  const d = dot(v, n);
  return sub(v, scale(n, 2 * d));
}
