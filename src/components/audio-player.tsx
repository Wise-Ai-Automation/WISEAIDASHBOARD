import { Download, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatClock } from "@/lib/format";

const SPEEDS = [1, 1.25, 1.5, 2];

export function AudioPlayer({ src, filename }: { src: string; filename: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          className="size-9 shrink-0 rounded-full"
          onClick={() => {
            if (!ref.current) return;
            if (playing) ref.current.pause();
            else void ref.current.play();
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatClock(current)}</span>
        <Slider
          value={[current]}
          max={duration || 1}
          step={0.1}
          onValueChange={(values) => {
            const value = values[0] ?? 0;
            if (ref.current) ref.current.currentTime = value;
            setCurrent(value);
          }}
        />
        <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatClock(duration)}</span>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 tabular-nums"
          onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length] ?? 1)}
        >
          {speed}x
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <a href={src} download={filename} aria-label="Download recording">
            <Download className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
