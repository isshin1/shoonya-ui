// src/components/ChartIcons.tsx
import React from "react"

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export const TextIcon = () => (
  <svg {...iconProps}>
    <text x="3" y="17" fontSize="14" fontFamily="sans-serif">T</text>
  </svg>
)

export const LineIcon = () => (
  <svg {...iconProps}>
    <circle cx="5" cy="18" r="1" />
    <circle cx="19" cy="6" r="1" />
    <line x1="5" y1="18" x2="19" y2="6" />
  </svg>
)

export const UpIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="18" r="1" />
    <path d="M12 18 L12 6" />
    <path d="M8 10 L12 6 L16 10" />
  </svg>
)

export const DownIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="6" r="1" />
    <path d="M12 6 L12 18" />
    <path d="M8 14 L12 18 L16 14" />
  </svg>
)

export const ClearIcon = () => (
  <svg {...iconProps}>
    <path d="M5 5 L19 19 M19 5 L5 19" />
  </svg>
)

export const SelectIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
)
