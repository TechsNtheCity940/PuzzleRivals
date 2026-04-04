import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  ROUTE_MUSIC_PLAYLISTS,
  resolveRouteMusicCue,
  type RouteMusicCue,
} from "@/lib/route-music";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";

const FADE_DURATION_MS = 320;
const FADE_INTERVAL_MS = 40;

export default function RouteMusicController() {
  const location = useLocation();
  const { musicEnabled } = useAppPreferences();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeCueRef = useRef<RouteMusicCue>(null);
  const trackIndexRef = useRef(0);
  const fadeTimerRef = useRef<number | null>(null);
  const unlockCleanupRef = useRef<(() => void) | null>(null);
  const resumeOnVisibleRef = useRef(false);
  const cue = musicEnabled ? resolveRouteMusicCue(location.pathname) : null;

  function clearFadeTimer() {
    if (fadeTimerRef.current !== null) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }

  function detachUnlockListeners() {
    unlockCleanupRef.current?.();
    unlockCleanupRef.current = null;
  }

  function fadeTo(targetVolume: number, onComplete?: () => void) {
    const audio = audioRef.current;
    if (!audio) {
      onComplete?.();
      return;
    }

    clearFadeTimer();

    const steps = Math.max(1, Math.floor(FADE_DURATION_MS / FADE_INTERVAL_MS));
    const startVolume = audio.volume;
    let step = 0;

    if (Math.abs(startVolume - targetVolume) < 0.01) {
      audio.volume = targetVolume;
      onComplete?.();
      return;
    }

    fadeTimerRef.current = window.setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress >= 1) {
        clearFadeTimer();
        onComplete?.();
      }
    }, FADE_INTERVAL_MS);
  }

  function playTrack(nextCue: Exclude<RouteMusicCue, null>, nextIndex: number, restart: boolean) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const playlist = ROUTE_MUSIC_PLAYLISTS[nextCue];
    if (playlist.tracks.length === 0) {
      return;
    }

    const normalizedIndex = ((nextIndex % playlist.tracks.length) + playlist.tracks.length) % playlist.tracks.length;
    const trackPath = playlist.tracks[normalizedIndex];
    const resolvedTrackUrl = new URL(trackPath, window.location.origin).toString();
    const trackChanged = audio.src !== resolvedTrackUrl;

    trackIndexRef.current = normalizedIndex;
    activeCueRef.current = nextCue;
    clearFadeTimer();

    if (trackChanged) {
      audio.pause();
      audio.src = resolvedTrackUrl;
      audio.load();
    }

    if (trackChanged || restart) {
      audio.currentTime = 0;
      audio.volume = 0;
    }

    const startPlayback = () => {
      const currentAudio = audioRef.current;
      if (!currentAudio || activeCueRef.current !== nextCue) {
        return;
      }

      const playback = currentAudio.play();
      if (!playback) {
        currentAudio.volume = playlist.volume;
        return;
      }

      void playback.then(() => {
        detachUnlockListeners();
        fadeTo(playlist.volume);
      }).catch(() => {
        if (unlockCleanupRef.current) {
          return;
        }

        const resumePlayback = () => {
          detachUnlockListeners();
          if (activeCueRef.current !== nextCue) {
            return;
          }
          playTrack(nextCue, normalizedIndex, false);
        };

        const handlePointer = () => resumePlayback();
        const handleKey = () => resumePlayback();
        window.addEventListener("pointerdown", handlePointer, { once: true, passive: true });
        window.addEventListener("touchstart", handlePointer, { once: true, passive: true });
        window.addEventListener("keydown", handleKey, { once: true });
        unlockCleanupRef.current = () => {
          window.removeEventListener("pointerdown", handlePointer);
          window.removeEventListener("touchstart", handlePointer);
          window.removeEventListener("keydown", handleKey);
        };
      });
    };

    startPlayback();
  }

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = 0;
    audioRef.current = audio;

    const handleEnded = () => {
      const activeCue = activeCueRef.current;
      if (!activeCue) {
        return;
      }

      playTrack(activeCue, trackIndexRef.current + 1, true);
    };

    const handleVisibilityChange = () => {
      const currentAudio = audioRef.current;
      if (!currentAudio) {
        return;
      }

      if (document.hidden) {
        resumeOnVisibleRef.current = !currentAudio.paused;
        if (resumeOnVisibleRef.current) {
          currentAudio.pause();
        }
        return;
      }

      if (resumeOnVisibleRef.current && activeCueRef.current) {
        resumeOnVisibleRef.current = false;
        playTrack(activeCueRef.current, trackIndexRef.current, false);
      }
    };

    audio.addEventListener("ended", handleEnded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      detachUnlockListeners();
      clearFadeTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const previousCue = activeCueRef.current;

    if (!audio) {
      return;
    }

    if (!cue) {
      activeCueRef.current = null;
      detachUnlockListeners();

      if (audio.paused) {
        return;
      }

      fadeTo(0, () => {
        audio.pause();
      });
      return;
    }

    const playlist = ROUTE_MUSIC_PLAYLISTS[cue];
    if (previousCue === cue) {
      if (audio.paused) {
        playTrack(cue, trackIndexRef.current, false);
        return;
      }

      fadeTo(playlist.volume);
      return;
    }

    trackIndexRef.current = 0;
    detachUnlockListeners();

    if (audio.paused) {
      playTrack(cue, 0, true);
      return;
    }

    fadeTo(0, () => {
      audio.pause();
      playTrack(cue, 0, true);
    });
  }, [cue]);

  return null;
}
