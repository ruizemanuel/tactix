export interface NodePos {
  x: number;
  y: number;
}

// Positions roughly mirror the fixture topology: north (top), south (mid), islands (right).
export const NODE_POS: Record<string, NodePos> = {
  n1: { x: 20, y: 15 },
  n2: { x: 40, y: 12 },
  n3: { x: 30, y: 32 },
  s1: { x: 35, y: 52 },
  s2: { x: 18, y: 66 },
  s3: { x: 50, y: 66 },
  i1: { x: 70, y: 60 },
  i2: { x: 84, y: 50 },
  i3: { x: 92, y: 38 },
};

export const CONTINENT_COLOR: Record<string, string> = {
  north: "var(--color-north)",
  south: "var(--color-south)",
  islands: "var(--color-islands)",
};

export function ownerColor(ownerId: string): string {
  if (ownerId === "you") return "var(--color-you)";
  if (ownerId === "ai") return "var(--color-ai)";
  return "var(--color-neutral)";
}
