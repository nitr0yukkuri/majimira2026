"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Player, IPlayerApp, IPhrase, IWord } from "textalive-app-api";

interface PlayerContextType {
    player: Player | null;
    isPlaying: boolean;
    isReady: boolean;
    play: () => void;
    pause: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayer] = useState<Player | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const playerRef = useRef<Player | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Prevent Next.js dev overlay from aggressively showing harmless AbortError from media.play()
        if (!(HTMLMediaElement.prototype as any)._isPatchedForAbort) {
            const originalPlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function () {
                const promise = originalPlay.apply(this, arguments as any);
                if (promise !== undefined) {
                    promise.catch((error) => {
                        if (error.name !== "AbortError" && error.name !== "NotAllowedError") throw error;
                    });
                }
                return promise; // Return the original promise so TextAlive's internal state doesn't break!
            };
            (HTMLMediaElement.prototype as any)._isPatchedForAbort = true;
        }

        if (playerRef.current) return;

        const mediaEl = document.querySelector("#media");
        
        const newPlayer = new Player({
            app: {
                appAuthor: "NeoCity Awaken",
                appName: "Prototype",
                token: "test", // 実際の運用時は正規のデベロッパートークンに置き換えてください
            },
            mediaElement: mediaEl as HTMLElement,
        });

        newPlayer.addListener({
            onAppReady: (app: IPlayerApp) => {
                if (!app.managed) {
                    newPlayer.createFromSongUrl("https://piapro.jp/t/E2i3/20251215092113");
                }
            },
            onVideoReady: () => {
                console.log("Video is ready!");
            },
            onTimerReady: () => {
                console.log("Timer is ready!");
                setIsReady(true);
            },
            onPlay: () => setIsPlaying(true),
            onPause: () => setIsPlaying(false),
            onStop: () => setIsPlaying(false),
        });

        playerRef.current = newPlayer;
        setPlayer(newPlayer);

        return () => {
            newPlayer.dispose();
            playerRef.current = null;
            if (mediaEl) {
                mediaEl.innerHTML = "";
            }
        };
    }, []);

    const play = () => player?.requestPlay();
    const pause = () => player?.requestPause();

    return (
        <PlayerContext.Provider value={{ player, isPlaying, isReady, play, pause }}>
            {children}
            <div id="media" className="hidden"></div>
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
    return ctx;
}
