"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import BuildingGlows from "./BuildingGlows";
import BuildingMeshes from "./BuildingMeshes";
import GroundPlane from "./GroundPlane";
import Windows from "./Windows";
import { generateBuildings, generateWindowData } from "./buildingsData";
import { useBuildingsAnimation } from "./useBuildingsAnimation";

export default function Buildings({ testMode }: { testMode: boolean }) {
    const buildings = useMemo(() => generateBuildings(), []);
    const windowData = useMemo(() => generateWindowData(buildings), [buildings]);
    const windowsMeshRef = useRef<THREE.InstancedMesh>(null);

    const { groupRef, targetBuilding } = useBuildingsAnimation({
        testMode,
        buildings,
        windowData,
        windowsMeshRef,
    });

    return (
        <>
            <group ref={groupRef}>
                <BuildingGlows buildings={buildings} targetBuilding={targetBuilding} />
                <BuildingMeshes buildings={buildings} />
                {windowData.matrices.length > 0 && <Windows count={windowData.matrices.length} meshRef={windowsMeshRef} />}
            </group>
            <GroundPlane />
        </>
    );
}
