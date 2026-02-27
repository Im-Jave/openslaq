import { useEffect, useRef } from "react";
import type { ParticipantTrackInfo } from "@openslaq/huddle/client";

interface VideoTileProps {
  participant: ParticipantTrackInfo;
  isLocal?: boolean;
}

export function VideoTile({ participant, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const track = participant.cameraTrack ?? participant.screenTrack;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;

    const stream = new MediaStream([track]);
    el.srcObject = stream;

    return () => {
      el.srcObject = null;
    };
  }, [track]);

  const hasVideo = !!track;
  const initials = participant.userId.slice(0, 2).toUpperCase();

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center ${
        participant.isSpeaking ? "ring-2 ring-green-400" : ""
      }`}
      data-testid={`video-tile-${participant.userId}`}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-gray-300 font-semibold">
          {initials}
        </div>
      )}

      {/* Name overlay */}
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
        {isLocal && <span className="text-gray-400">(You)</span>}
        <span className="truncate max-w-[120px]">{participant.userId}</span>
        {participant.isMuted && (
          <svg className="w-3 h-3 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </div>
    </div>
  );
}
