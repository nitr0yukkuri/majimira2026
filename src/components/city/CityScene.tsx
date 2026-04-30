"use client";

import React, { useCallback, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import IntersectionAndRoads from "./IntersectionAndRoads";
import LightTrails from "./LightTrails";
import TrafficLights from "./TrafficLights";
import Buildings from "./Buildings";
import Lyrics from "@/components/Lyrics";

interface SyncCue {
    color: string;
    worldX: number;
    worldZ: number;
    at: number;
}

/**
 * CityScene is the top-level aggregator for all 3D city elements.
 * It owns ambient/directional lighting and delegates rendering to
 * single-responsibility sub-components.
 *
 * Props:
 *   testMode — when true, disables the cinematic camera so OrbitControls can be used freely
 */
export default function CityScene({ testMode }: { testMode: boolean }) {
    const { isPlaying } = usePlayer();
    const [syncCue, setSyncCue] = useState<SyncCue | null>(null);

    const onSyncEvent = useCallback((event: { color: string; worldX: number; worldZ: number }) => {
        setSyncCue({ ...event, at: performance.now() });
    }, []);

    return (
        <>
            {/* Scene-wide lighting */}
            <ambientLight intensity={isPlaying ? 1 : 0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <IntersectionAndRoads />
            <LightTrails />
            <TrafficLights onSyncEvent={onSyncEvent} />
            <Buildings testMode={testMode} onSyncEvent={onSyncEvent} />
            <Lyrics syncCue={syncCue} />
        </>
    );
}
