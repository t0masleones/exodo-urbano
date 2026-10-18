import { MAP_H, MAP_W } from '../config';

export interface TilePos { x: number; y: number }

const N4: TilePos[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/**
 * BFS em 4 direções. Com `adjacent`, o destino é qualquer vizinho livre do alvo
 * (para agir sobre árvores, pedras, canteiros...). Retorna os tiles do caminho
 * sem o tile inicial, ou null se não há caminho.
 */
export function findPath(
  blocked: (x: number, y: number) => boolean,
  start: TilePos,
  goal: TilePos,
  adjacent: boolean,
): TilePos[] | null {
  const goals = new Set<number>();
  const id = (x: number, y: number) => y * MAP_W + x;
  if (!adjacent && !blocked(goal.x, goal.y)) goals.add(id(goal.x, goal.y));
  else for (const d of N4) {
    const x = goal.x + d.x, y = goal.y + d.y;
    if (!blocked(x, y)) goals.add(id(x, y));
  }
  if (goals.size === 0) return null;
  if (goals.has(id(start.x, start.y))) return [];

  const parent = new Int32Array(MAP_W * MAP_H).fill(-1);
  const startId = id(start.x, start.y);
  parent[startId] = startId;
  const queue = [startId];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const cx = cur % MAP_W, cy = Math.floor(cur / MAP_W);
    for (const d of N4) {
      const x = cx + d.x, y = cy + d.y;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || blocked(x, y)) continue;
      const n = id(x, y);
      if (parent[n] !== -1) continue;
      parent[n] = cur;
      if (goals.has(n)) {
        const path: TilePos[] = [];
        for (let p = n; p !== startId; p = parent[p]) path.push({ x: p % MAP_W, y: Math.floor(p / MAP_W) });
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}
