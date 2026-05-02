"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Building } from "@/types/city";

export default function BuildingGlows({
    buildings,
    targetBuilding,
}: {
    buildings: Building[];
    targetBuilding: React.RefObject<number>;
}) {
    const glowMaterialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

    useFrame(() => {
        const focusedBuilding = targetBuilding.current;
        for (let i = 0; i < glowMaterialRefs.current.length; i++) {
            const material = glowMaterialRefs.current[i];
            if (!material) continue;

            const isFocused = i === focusedBuilding;
            material.opacity += ((isFocused ? 0.16 : 0.0) - material.opacity) * 0.12;
        }
    });

    return (
        <>
            {buildings.map((b, index) => (
                <mesh key={`glow-${b.id}`} position={[b.x, b.h / 2, b.z]} scale={[1.14, 1.08, 1.14]} renderOrder={0.2}>
                    <boxGeometry args={[1, b.h, 1]} />
                    <meshBasicMaterial
                        ref={(material) => {
                            glowMaterialRefs.current[index] = material;
                        }}
                        color="#00fff0"
                        transparent
                        opacity={0}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            ))}
        </>
    );
}
