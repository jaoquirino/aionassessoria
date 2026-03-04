import { useState, useRef, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentThumbnailProps {
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  onDelete?: () => void;
  size?: "sm" | "md";
}

export function AttachmentThumbnail({ fileUrl, fileName, fileType, onDelete, size = "sm" }: AttachmentThumbnailProps) {
  const isImage = fileType?.startsWith("image/");
  const isVideo = fileType?.startsWith("video/");
  const [videoHovered, setVideoHovered] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sizeClass = size === "sm" ? "h-20 w-20" : "h-24 w-24";

  const handleMouseEnter = useCallback(() => {
    if (!isVideo) return;
    hoverTimerRef.current = setTimeout(() => {
      setVideoHovered(true);
      videoRef.current?.play().catch(() => {});
      setIsPlaying(true);
    }, 300);
  }, [isVideo]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!videoExpanded) {
      setVideoHovered(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [videoExpanded]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const toggleExpand = useCallback(() => {
    setVideoExpanded((prev) => {
      const next = !prev;
      if (!next && videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
        setVideoHovered(false);
      }
      return next;
    });
  }, []);

  if (isImage) {
    return (
      <div className="relative group">
        <img
          src={fileUrl}
          alt={fileName}
          className={cn(sizeClass, "object-cover rounded-lg border border-border cursor-pointer hover:shadow-md transition-shadow")}
          onClick={() => window.open(fileUrl, "_blank")}
        />
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <>
        <div
          className="relative group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Thumbnail state */}
          <div
            className={cn(
              sizeClass,
              "rounded-lg border border-border overflow-hidden cursor-pointer relative",
              videoHovered && "ring-2 ring-primary/50"
            )}
            onClick={toggleExpand}
          >
            <video
              ref={videoRef}
              src={fileUrl}
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            {!videoHovered && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
            )}
          </div>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Expanded video overlay */}
        {videoExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={toggleExpand}
          >
            <div
              className="relative max-w-2xl w-full mx-4 rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={fileUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full rounded-xl"
                ref={(el) => {
                  if (el) {
                    el.muted = isMuted;
                    el.play().catch(() => {});
                  }
                }}
              />
              {/* Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-center gap-3">
                <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
                </button>
                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <div className="flex-1" />
                <button onClick={toggleExpand} className="text-white hover:text-primary transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic file
  return (
    <div className="relative group">
      <div className={cn(sizeClass, "flex items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground p-1 text-center")}>
        {fileName}
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

interface PendingFileThumbnailProps {
  file: File;
  onDelete: () => void;
  size?: "sm" | "md";
}

export function PendingFileThumbnail({ file, onDelete, size = "sm" }: PendingFileThumbnailProps) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const [previewUrl] = useState(() => (isImage || isVideo) ? URL.createObjectURL(file) : null);
  const sizeClass = size === "sm" ? "h-20 w-20" : "h-24 w-24";

  if (isImage && previewUrl) {
    return (
      <div className="relative group">
        <img src={previewUrl} alt={file.name} className={cn(sizeClass, "object-cover rounded-lg border border-border")} />
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isVideo && previewUrl) {
    return (
      <div className="relative group">
        <div className={cn(sizeClass, "rounded-lg border border-border overflow-hidden relative")}>
          <video src={previewUrl} muted preload="metadata" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-5 w-5 text-white fill-white" />
          </div>
        </div>
        <button
          onClick={onDelete}
          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className={cn(sizeClass, "flex items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground p-1 text-center")}>
        {file.name}
      </div>
      <button
        onClick={onDelete}
        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
