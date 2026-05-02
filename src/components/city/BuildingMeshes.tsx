"use client";

import React from "react";
import { Edges } from "@react-three/drei";
import type { Building } from "@/types/city";

export default function BuildingMeshes({ buildings }: { buildings: Building[] }) {
    return (
        <>
            {buildings.map((b) => (
                <mesh key={b.id} position={[b.x, b.h / 2, b.z]}>
                    <boxGeometry args={[1, b.h, 1]} />
                    <meshStandardMaterial color="#020813" roughness={0.8} metalness={0.2} />
                    <Edges color="#00ffcc" threshold={15} />
                </mesh>
            ))}
        </>
    );
}
