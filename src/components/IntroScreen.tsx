import React, { useRef, useState } from 'react';
import { SkipForward, Volume2, VolumeX } from 'lucide-react';

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      if (!next && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#07090c] overflow-hidden select-none flex items-center justify-center">
      {!videoError ? (
        <video
          ref={videoRef}
          src="https://res.cloudinary.com/v7vzdizx/video/upload/v1795035219/20261118_200619_UTC_0.mp4"
          autoPlay
          muted={muted}
          playsInline
          onEnded={onComplete}
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-center space-y-4 px-6">
          <h1 className="font-display text-4xl font-bold tracking-[0.2em] text-stone-100">
            LA FINCA
          </h1>
          <p className="text-xs text-stone-400">
            No se pudo reproducir el video de presentación.
          </p>
        </div>
      )}

      {/* Discreet bottom-right intro controls */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
        {!videoError && (
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#07090c]/80 hover:bg-[#141922] border border-white/15 rounded text-xs text-stone-200 transition-colors cursor-pointer"
          >
            {muted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
                Activar sonido
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Silenciar
              </>
            )}
          </button>
        )}

        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-4 py-2 bg-[#07090c]/85 hover:bg-amber-600 hover:text-stone-950 border border-white/20 hover:border-amber-500 rounded text-xs font-semibold text-stone-100 transition-colors cursor-pointer"
        >
          <span>{videoError ? 'Continuar al Menú' : 'Saltar presentación'}</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
