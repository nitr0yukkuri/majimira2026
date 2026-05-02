"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Player, IPlayerApp, IPhrase, IWord } from "textalive-app-api";

interface PlayerContextType {
    player: Player | null;
    isPlaying: boolean;
    isReady: boolean;
    play: () => void;
    pause: () => void;
    stop: () => void;
    seek: (position: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [player, setPlayer] = useState<Player | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const playerRef = useRef<Player | null>(null);
    const mediaRef = useRef<HTMLAudioElement | null>(null);
    const initPatched = useRef(false);
    const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Patch HTMLMediaElement on first mount only
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (initPatched.current) return;

        if (!(HTMLMediaElement.prototype as any)._isPatchedForAbort) {
            const originalPlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function () {
                const promise = originalPlay.apply(this, arguments as any);
                if (promise !== undefined) {
                    promise.catch((error) => {
                        if (error.name !== "AbortError" && error.name !== "NotAllowedError") throw error;
                    });
                }
                return promise;
            };
            (HTMLMediaElement.prototype as any)._isPatchedForAbort = true;
        }
        initPatched.current = true;
    }, []);

    // Initialize Player when mediaRef is attached to DOM
    const handleMediaRef = (element: HTMLAudioElement | null) => {
        mediaRef.current = element;

        // If Player already initialized or element removed, skip
        if (!element || playerRef.current) return;

        // Ensure element is actually in the DOM
        if (!document.body.contains(element)) return;

        // Delay initialization slightly to ensure DOM is fully ready
        if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);

        initTimeoutRef.current = setTimeout(() => {
            if (!playerRef.current && mediaRef.current) {
                try {
                    const newPlayer = new Player({
                        app: {
                            appAuthor: "NeoCity Awaken",
                            appName: "Prototype",
                            token: "test",
                        },
                        mediaElement: mediaRef.current,
                    });

                    newPlayer.addListener({
                        onAppReady: (app: IPlayerApp) => {
                            if (!app.managed) {
                                try {
                                    newPlayer.createFromSongUrl("https://piapro.jp/t/E2i3/20251215092113");
                                } catch (err) {
                                    console.error("Error creating song from URL:", err);
                                }
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
                } catch (error) {
                    console.error("Failed to create Player instance:", error);
                }
            }
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
            if (playerRef.current) {
                playerRef.current.dispose();
                playerRef.current = null;
            }
        };
    }, []);

    const play = () => player?.requestPlay();
    const pause = () => player?.requestPause();
    const stop = () => {
        if (!player) return;
        player.requestPause();
        player.requestMediaSeek(0);
        setIsPlaying(false);
    };
    const seek = (position: number) => player?.requestMediaSeek(position);

    return (
        <PlayerContext.Provider value={{ player, isPlaying, isReady, play, pause, stop, seek }}>
            {children}
            <audio
                id="media"
                ref={handleMediaRef}
                className="hidden"
                crossOrigin="anonymous"
                preload="auto"
            />
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
    return ctx;
}
