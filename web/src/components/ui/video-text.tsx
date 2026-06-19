"use client"

import React, { ElementType, ReactNode, useId } from "react"
import { cn } from "@/lib/utils"

export interface VideoTextProps {
  src: string
  className?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  preload?: "auto" | "metadata" | "none"
  children: ReactNode
  fontSize?: string | number
  fontWeight?: string | number
  textAnchor?: string
  dominantBaseline?: string
  fontFamily?: string
  as?: ElementType
}

export function VideoText({
  src,
  children,
  className = "",
  autoPlay = true,
  muted = true,
  loop = true,
  preload = "auto",
  fontSize = 20,
  fontWeight = "bold",
  textAnchor = "middle",
  dominantBaseline = "middle",
  fontFamily = "sans-serif",
  as: Component = "div",
}: VideoTextProps) {
  // useId gives a stable unique string; strip colons so it's a valid SVG id
  const uid = useId().replace(/:/g, "")
  const maskId = `vt-mask-${uid}`
  const content = React.Children.toArray(children).join("")
  // Split on \n so callers can request multiple lines
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean)
  const responsiveFontSize = typeof fontSize === "number" ? `${fontSize}vw` : fontSize

  // Distribute N lines evenly: line i sits at (2i+1)/(2N) * 100% vertically
  const lineY = (i: number) => `${((2 * i + 1) / (2 * lines.length)) * 100}%`

  return (
    <Component className={cn("relative size-full", className)}>
      {/*
        Inline SVG keeps the <mask> in the live DOM, so the browser resolves
        CSS font-family (including web fonts like Satoshi) exactly the same as
        any other element on the page. A data-URL mask cannot do this.
      */}
      <svg
        width="100%"
        height="100%"
        aria-hidden
        style={{ display: "block" }}
      >
        <defs>
          <mask id={maskId}>
            {/* Black background = fully hidden */}
            <rect width="100%" height="100%" fill="black" />
            {/* Each line of text = a "window" into the video */}
            {lines.map((line, i) => (
              <text
                key={i}
                x="50%"
                y={lineY(i)}
                textAnchor={textAnchor}
                dominantBaseline={dominantBaseline}
                fill="white"
                style={{ fontSize: responsiveFontSize, fontWeight, fontFamily }}
              >
                {line}
              </text>
            ))}
          </mask>
        </defs>

        {/* foreignObject lets us embed a real <video> element inside the SVG */}
        <foreignObject width="100%" height="100%" mask={`url(#${maskId})`}>
          {/* xmlns required on the root element inside foreignObject */}
          <div
            // @ts-ignore -- xmlns is not in React's HTMLAttributes but is required here
            xmlns="http://www.w3.org/1999/xhtml"
            style={{ width: "100%", height: "100%" }}
          >
            <video
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              autoPlay={autoPlay}
              muted={muted}
              loop={loop}
              preload={preload}
              playsInline
            >
              <source src={src} />
            </video>
          </div>
        </foreignObject>
      </svg>

      <span className="sr-only">{content}</span>
    </Component>
  )
}
