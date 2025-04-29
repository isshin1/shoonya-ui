import * as React from "react"
import { cn } from "@/lib/utils"

interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Tile = React.forwardRef<HTMLDivElement, TileProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-solid border-gray-200 bg-white shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Tile.displayName = "Tile"

interface TileHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TileHeader = React.forwardRef<HTMLDivElement, TileHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("border-b border-gray-200 p-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TileHeader.displayName = "TileHeader"

interface TileTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const TileTitle = React.forwardRef<HTMLHeadingElement, TileTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-lg font-medium leading-6 text-gray-900", className)}
        {...props}
      >
        {children}
      </h3>
    )
  }
)
TileTitle.displayName = "TileTitle"

interface TileContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TileContent = React.forwardRef<HTMLDivElement, TileContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TileContent.displayName = "TileContent"

export { Tile, TileHeader, TileTitle, TileContent }
