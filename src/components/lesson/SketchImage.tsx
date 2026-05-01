import { useMemo } from "react";
import { getSketch } from "../../lib/sketches";

interface SketchImageProps {
  word: string;
  className?: string;
  size?: number;
}

/**
 * Renders an inline SVG sketch illustration for a vocab word.
 * Falls back gracefully to an emoji then a letter badge — always shows something.
 */
export function SketchImage({ word, className = "", size = 108 }: SketchImageProps) {
  const svgString = useMemo(() => getSketch(word), [word]);

  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
