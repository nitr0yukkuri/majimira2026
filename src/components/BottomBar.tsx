"use client";

import React from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function BottomBar() {
    const { isPlaying, isReady, play, pause, stop } = usePlayer();

    const handlePlayToggle = () => {
        if (isPlaying) pause();
        else play();
    };

    return (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 60 }}>
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(8,10,12,0.6)', padding: '10px 14px', borderRadius: 12, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button aria-label="seek-back" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, color: '#0ff' }}>⏮</button>
                    <button aria-label="play-toggle" onClick={handlePlayToggle} disabled={!isReady} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', background: isPlaying ? '#0a2230' : '#022', border: '1px solid rgba(0,255,204,0.12)', borderRadius: 12, color: '#0ff' }}>{isPlaying ? '❚❚' : '▶'}</button>
                    <button aria-label="stop" onClick={() => stop()} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#111', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, color: '#f0f' }}>◼</button>
                </div>

                <div style={{ width: 360, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, background: '#0b1220', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '28%', height: '100%', background: 'linear-gradient(90deg,#00fff0,#ff6aff)' }} />
                    </div>
                    <div style={{ minWidth: 64, color: '#bfcbd6', fontSize: 13, textAlign: 'right' }}>SECTION: INTRO</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, background: isReady ? '#00cc66' : '#ffa500', borderRadius: 10 }} />
                    <div style={{ color: '#9fb8c6', fontSize: 12 }}>{isReady ? 'READY' : 'LOADING...'}</div>
                </div>
            </div>
        </div>
    );
}
