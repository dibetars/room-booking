const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

export function generateReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BKB-${date}-${randomSegment(6)}`;
}
