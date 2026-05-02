"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { generateBuildings, generateWindowData } from "./buildingsData";
import BuildingMeshes from "./BuildingMeshes";
import BuildingGlows from "./BuildingGlows";
import Windows from "./Windows";
import GroundPlane from "./GroundPlane";
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

    useEffect(() => {
        const mesh = windowsMeshRef.current;
        if (!mesh) return;
        const black = new THREE.Color("#000000");

        for (let i = 0; i < windowData.matrices.length; i++) {
            mesh.setMatrixAt(i, windowData.matrices[i]);
            mesh.setColorAt(i, black);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, [windowData]);

    return (
        <>
            <group ref={groupRef}>
                <BuildingGlows buildings={buildings} targetBuilding={targetBuilding} />
                <BuildingMeshes buildings={buildings} />
                {windowData.matrices.length > 0 && (
                    <Windows count={windowData.matrices.length} meshRef={windowsMeshRef} />
                )}
            </group>
            <GroundPlane />
        </>
    );
}
