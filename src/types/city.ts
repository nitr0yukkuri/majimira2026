// Shared types for the city scene components

export interface Building {
    id: string;
    x: number;
    z: number;
    h: number;
}

export type TrailAxis = "NS" | "EW";

export interface Trail {
    id: number;
    axis: TrailAxis;
    /** Lane offset within the road (-0.65, 0, or 0.65) */
    lane: number;
    speed: number;
    color: string;
    length: number;
}
