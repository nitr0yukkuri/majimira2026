"use client";

import { usePlayer, PlayerProvider } from "@/contexts/PlayerContext";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import React from 'react';
import BottomBar from '@/components/BottomBar';
import { IPhrase, IWord } from "textalive-app-api";

// Disable SSR for 3D component and APIs using browser globals
const Scene = dynamic(() => import("@/components/Scene").then(mod => mod.default), { ssr: false });

const neonColors = ['text-[#ff00ff]', 'text-[#00ffff]', 'text-[#ffff00]', 'text-[#ff8800]'];
const glowColors = ['drop-shadow-[0_0_15px_#ff00ff]', 'drop-shadow-[0_0_15px_#00ffff]', 'drop-shadow-[0_0_15px_#ffff00]', 'drop-shadow-[0_0_15px_#ff8800]'];

const hash = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
};

function UIOverlay() {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8">
      <BottomLyricsBand />
      <BottomBar />
    </div>
  );
}

function BottomLyricsBand() {
  const { player, isPlaying } = usePlayer();
  const [phraseText, setPhraseText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const lastPhraseStartRef = useRef<number | null>(null);
  const phraseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phraseTimerRef.current !== null) {
      window.clearTimeout(phraseTimerRef.current);
      phraseTimerRef.current = null;
    }

    if (!player || !isPlaying) {
      lastPhraseStartRef.current = null;
      setPhraseText("");
      setIsVisible(false);
      return;
    }

    let frameId = 0;
    const tick = () => {
      if (!player.video || !isPlaying) {
        lastPhraseStartRef.current = null;
        setPhraseText("");
        setIsVisible(false);
        frameId = requestAnimationFrame(tick);
        return;
      }

      const pos = player.timer.position;
      const phrase = player.video.findPhrase(pos) || null;

      if (!phrase) {
        lastPhraseStartRef.current = null;
        setPhraseText("");
        setIsVisible(false);
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (phrase.startTime !== lastPhraseStartRef.current) {
        lastPhraseStartRef.current = phrase.startTime;
        setIsVisible(false);
        phraseTimerRef.current = window.setTimeout(() => {
          setPhraseText(phrase.text ?? "");
          requestAnimationFrame(() => setIsVisible(true));
        }, 120);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      if (phraseTimerRef.current !== null) {
        window.clearTimeout(phraseTimerRef.current);
        phraseTimerRef.current = null;
      }
    };
  }, [player, isPlaying]);

  const bandStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 110,
    width: "min(860px, calc(100% - 48px))",
    pointerEvents: "none",
    zIndex: 65,
  };

  const panelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    padding: "10px 16px",
    borderRadius: 16,
    background: "rgba(8,10,12,0.28)",
    border: "1px solid rgba(255,255,255,0.045)",
    backdropFilter: "blur(8px)",
    color: "#ffffff",
    textAlign: "center",
    fontSize: "clamp(16px, 1.9vw, 24px)",
    lineHeight: 1.2,
    letterSpacing: "0.03em",
    textShadow: "0 0 10px rgba(0,255,240,0.18)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0)" : "translateY(6px)",
    transition: "opacity 220ms ease, transform 220ms ease",
  };

  return (
    <div style={bandStyle}>
      <div style={panelStyle}>{phraseText || " "}</div>
    </div>
  );
}

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  return (
    <PlayerProvider>
      <main className="w-screen h-screen bg-black overflow-hidden relative font-sans">
        {/* The 3D World */}
        <div className="absolute inset-0 z-0 bg-black pointer-events-auto">
          <Scene />
        </div>

        {/* UI Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <UIOverlay />
        </div>

        {/* Welcome Modal */}
        <WelcomeModal show={showWelcome} onClose={() => setShowWelcome(false)} />
      </main>
    </PlayerProvider>
  );
}

function WelcomeModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  // 固定表示：指定された曲情報をそのまま表示します
  const title = "TAKEOVER";
  const artist = "Twinfield / 初音ミク";

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto">
      <div className="bg-linear-to-b from-[#0f1724] to-[#071026] border border-[#00ffcc]/25 rounded-3xl p-10 max-w-2xl w-[min(92%,900px)] text-center shadow-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-linear-to-r from-[#ff00ff] via-[#00ffff] to-[#ffff00] bg-clip-text text-transparent">
          MAJIMIRA 2026
        </h1>
        <p className="text-gray-300 mb-2 text-base sm:text-lg">
          TextAliveで歌詞にシンクロする3D都市が光り輝きます。
        </p>
        <div className="mt-4 mb-6">
          <div className="text-white text-lg font-semibold">{title}</div>
          {artist ? <div className="text-[#9eeaf1] text-sm mt-1">{artist}</div> : null}
        </div>
        <p className="text-gray-400 mb-6 text-xs text-center">下部のコントロールで再生・停止・シークができます</p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-linear-to-r from-[#ff00ff] to-[#00ffff] text-black font-bold rounded-lg hover:shadow-lg hover:shadow-[#00ffcc]/40 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}