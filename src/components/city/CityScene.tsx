"use client";

import React from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import IntersectionAndRoads from "./IntersectionAndRoads";
import LightTrails from "./LightTrails";
import TrafficLights from "./TrafficLights";
import Buildings from "@/components/city/Buildings";
import RainEffect from "./RainEffect";

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

    return (
        <>
            {/* Scene-wide lighting */}
            <ambientLight intensity={isPlaying ? 0.45 : 0.15} />
            <directionalLight position={[10, 10, 5]} intensity={0.65} />

            <IntersectionAndRoads />
            <LightTrails />
            <TrafficLights />
            <Buildings testMode={testMode} />
            <RainEffect />
        </>
    );
}
