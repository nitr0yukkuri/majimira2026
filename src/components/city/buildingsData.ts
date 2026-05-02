import * as THREE from "three";
import type { Building } from "@/types/city";

export const GRID_RANGE = 5;
export const GRID_SPACING = 2.5; // 道路幅 ±1.75 + ビル半幅 0.5 + 余白 0.25 = 2.5 以上必要
export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 4;

export const WINDOW_SIZE = 0.12;
export const WINDOW_COLS = 3;
export const WINDOW_SPACING = 1 / WINDOW_COLS;
export const FLOOR_HEIGHT = 0.4;
export const WALL_OFFSET = 0.5;

export interface WindowData {
    matrices: THREE.Matrix4[];
    buildingIndices: number[];
    positions: THREE.Vector3[];
    windowsByBuilding: number[][];
}

export function generateBuildings(): Building[] {
    const list: Building[] = [];
    for (let x = -GRID_RANGE; x <= GRID_RANGE; x++) {
        for (let z = -GRID_RANGE; z <= GRID_RANGE; z++) {
            const isRoad = x === 0 || z === 0;
            const skipRandom = Math.random() > 0.5;
            if (isRoad || skipRandom) continue;
            list.push({ id: `${x}-${z}`, x: x * GRID_SPACING, z: z * GRID_SPACING, h: Math.random() * MAX_HEIGHT + MIN_HEIGHT });
        }
    }
    return list;
}

export function generateWindowData(buildings: Building[]): WindowData {
    const matrices: THREE.Matrix4[] = [];
    const buildingIndices: number[] = [];
    const positions: THREE.Vector3[] = [];
    const windowsByBuilding: number[][] = buildings.map(() => []);

    const addWindow = (px: number, py: number, pz: number, ry: number, bIdx: number) => {
        const windowIndex = matrices.length;
        const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(px, py, pz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
            new THREE.Vector3(WINDOW_SIZE, WINDOW_SIZE, WINDOW_SIZE)
        );
        matrices.push(matrix);
        buildingIndices.push(bIdx);
        positions.push(new THREE.Vector3(px, py, pz));
        windowsByBuilding[bIdx].push(windowIndex);
    };

    buildings.forEach((b, bIdx) => {
        const floors = Math.max(1, Math.floor(b.h / FLOOR_HEIGHT));
        for (let f = 0; f < floors; f++) {
            const py = f * FLOOR_HEIGHT + FLOOR_HEIGHT / 2;
            for (let c = 0; c < WINDOW_COLS; c++) {
                const lx = -0.5 + (c + 0.5) * WINDOW_SPACING;
                addWindow(b.x + lx, py, b.z + WALL_OFFSET, 0, bIdx);
                addWindow(b.x + lx, py, b.z - WALL_OFFSET, Math.PI, bIdx);
                addWindow(b.x + WALL_OFFSET, py, b.z + lx, Math.PI / 2, bIdx);
                addWindow(b.x - WALL_OFFSET, py, b.z + lx, -Math.PI / 2, bIdx);
            }
        }
    });

    return { matrices, buildingIndices, positions, windowsByBuilding };
}
