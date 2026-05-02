"use client";

import React from "react";
import * as THREE from "three";

/**
 * instanceColor のみで色管理する。vertexColors は使わない。
 * setColorAt → instanceColor.needsUpdate の組み合わせだけで完結する。
 */
export default function Windows({ count, meshRef }: { count: number; meshRef: React.RefObject<THREE.InstancedMesh | null> }) {
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
        </instancedMesh>
    );
}
