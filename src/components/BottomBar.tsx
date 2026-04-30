"use client";

import React, { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function BottomBar() {
    const { player, isPlaying, isReady, play, pause, stop, seek } = usePlayer();
    const [isSeeking, setIsSeeking] = useState(false);

    const handlePlayToggle = () => {
        if (isPlaying) pause();
        else play();
    };

    // position/duration normalized to seconds
    const [posSecState, setPosSecState] = useState<number>(() => {
        const pr = Number(player?.timer?.position ?? 0);
        return pr > 1000 ? pr / 1000 : pr;
    });

    useEffect(() => {
        let rafId: number | null = null;
        const loop = () => {
            const pr = Number(player?.timer?.position ?? 0);
            const ps = pr > 1000 ? pr / 1000 : pr;
            setPosSecState(ps);
            rafId = requestAnimationFrame(loop);
        };

        // start loop when player exists
        if (player) {
            rafId = requestAnimationFrame(loop);
        }

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [player]);

    const posSec = posSecState;
    const durRaw = Number(player?.video?.duration ?? 0);
    const durSec = durRaw > 1000 ? durRaw / 1000 : durRaw;
    const percent = durSec > 0 ? Math.max(0, Math.min(100, (posSec / durSec) * 100)) : 0;

    const formatTime = (s: number) => {
        const mm = Math.floor(s / 60);
        const ss = Math.floor(s % 60).toString().padStart(2, "0");
        return `${mm}:${ss}`;
    };

    const seekFromClientX = (clientX: number) => {
        if (!player?.video) return;
        const rect = progressTrackRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const target = durRaw > 1000 ? durRaw * ratio : durRaw * ratio;
        seek(target);
    };

    const containerStyle: React.CSSProperties = {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 24,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 60,
    };

    const panelStyle: React.CSSProperties = {
        pointerEvents: "auto",
        display: "flex",
        gap: 12,
        alignItems: "center",
        background: "rgba(8,10,12,0.6)",
        padding: "10px 14px",
        borderRadius: 12,
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.04)",
    };

    const progressContainer: React.CSSProperties = {
        width: 360,
        display: "flex",
        flexDirection: "column",
        gap: 6,
    };

    const progressTrackRef = React.useRef<HTMLDivElement | null>(null);

    const barWrapper: React.CSSProperties = {
        flex: 1,
        height: 10,
        background: "rgba(11,18,32,0.82)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
    };

    const barFill: React.CSSProperties = {
        width: `${percent}%`,
        height: "100%",
        background: "linear-gradient(90deg,#00fff0,#ff6aff)",
        transition: isSeeking ? "none" : "width 0.12s linear",
    };

    // Responsive handling (no external CSS changes) — adapt sizes based on window width
    // IMPORTANT: initialize to a fixed value on the server and for the initial client render
    // to avoid hydration mismatches. Update to actual window width after mount.
    const [winW, setWinW] = useState<number>(1200);
    useEffect(() => {
        if (typeof window === "undefined") return;
        // update once on mount to the real size to avoid hydration mismatch
        setWinW(window.innerWidth);
        const onResize = () => setWinW(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const isSmall = winW < 560;
    const isMedium = winW >= 560 && winW < 920;

    const finalPanelStyle: React.CSSProperties = {
        ...panelStyle,
        padding: isSmall ? "8px 10px" : "10px 14px",
        gap: isSmall ? 8 : 12,
        alignItems: "center",
    };

    const playBtnSize = isSmall ? 36 : 44;
    // unify control sizes
    const ctrlBtnSize = playBtnSize;
    const controlFontSize = isSmall ? 14 : 18;

    const finalProgressContainer: React.CSSProperties = {
        ...progressContainer,
        width: isSmall ? Math.min(0.78 * winW, 260) : isMedium ? 320 : 360,
    };

    const elapsedFont = isSmall ? 11 : 12;
    const remainingFont = isSmall ? 12 : 13;

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!player?.video) return;
        setIsSeeking(true);
        seekFromClientX(event.clientX);

        const onMove = (moveEvent: PointerEvent) => seekFromClientX(moveEvent.clientX);
        const onUp = () => {
            setIsSeeking(false);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    };

    return (
        <div style={containerStyle}>
            <div style={finalPanelStyle}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button aria-label="play-toggle" onClick={handlePlayToggle} disabled={!isReady} style={{ width: playBtnSize, height: playBtnSize, display: "grid", placeItems: "center", background: isPlaying ? "#0a2230" : "#022", border: "1px solid rgba(0,255,204,0.12)", borderRadius: 12, color: "#0ff", fontSize: controlFontSize }}>
                        {isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={isSmall ? 16 : 18} height={isSmall ? 16 : 18} aria-hidden="true" focusable="false">
                                <g fill="#00fff0">
                                    <rect x="6" y="5" width="3" height="14" rx="0.5" />
                                    <rect x="15" y="5" width="3" height="14" rx="0.5" />
                                </g>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={isSmall ? 16 : 18} height={isSmall ? 16 : 18} aria-hidden="true" focusable="false">
                                <g fill="#00fff0">
                                    <path d="M8 5v14l11-7z" />
                                </g>
                            </svg>
                        )}
                    </button>
                    <button aria-label="stop" onClick={() => stop()} style={{ width: ctrlBtnSize, height: ctrlBtnSize, display: "grid", placeItems: "center", background: "#111", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, color: "#f0f", fontSize: controlFontSize }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={isSmall ? 16 : 18} height={isSmall ? 16 : 18} aria-hidden="true" focusable="false">
                            <g fill="#ff6aff">
                                <rect x="6" y="6" width="12" height="12" rx="1.5" />
                            </g>
                        </svg>
                    </button>
                </div>

                <div style={finalProgressContainer}>
                    <div ref={progressTrackRef} style={barWrapper} onPointerDown={onPointerDown}>
                        <div style={barFill} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ color: "#9fb8c6", fontSize: elapsedFont, minWidth: 48, textAlign: "left" }}>{formatTime(posSec)}</div>
                        <div style={{ flex: 1 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 64, justifyContent: "flex-end" }}>
                            <div style={{ color: "#bfcbd6", fontSize: remainingFont, textAlign: "right" }}>{`-${formatTime(Math.max(0, durSec - posSec))}`}</div>
                            <div style={{ width: 10, height: 10, background: isReady ? "#00cc66" : "#ffa500", borderRadius: 10 }} />
                            <div style={{ color: "#9fb8c6", fontSize: remainingFont }}>{isReady ? "READY" : "LOADING..."}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

