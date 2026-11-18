import { BALL_RADIUS, TABLE_HEIGHT, TABLE_WIDTH } from './billiards-types';

/** Table (x, y) on the felt → Rapier / Three world (X, Y, Z). Y is up. */
export function tableToWorld(x: number, tableY: number): { x: number; y: number; z: number } {
  return { x, y: BALL_RADIUS, z: tableY };
}

export function worldToTable(x: number, z: number): { x: number; y: number } {
  return { x, y: z };
}

export function tableToStagePercent(x: number, tableY: number): { left: string; top: string } {
  return {
    left: `${(x / TABLE_WIDTH) * 100}%`,
    top: `${(tableY / TABLE_HEIGHT) * 100}%`,
  };
}
