import * as React from "react"
import { GripVertical } from 'lucide-react'

interface ResizableProps {
  children: [React.ReactNode, React.ReactNode]
  defaultSize?: number
  minSize?: number
  maxSize?: number
}

export function Resizable({
  children,
  defaultSize = 30,
  minSize = 20,
  maxSize = 80,
}: ResizableProps) {
  const [size, setSize] = React.useState(defaultSize)
  const [isResizing, setIsResizing] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newSize = ((e.clientX - containerRect.left) / containerRect.width) * 100

    setSize(Math.min(Math.max(newSize, minSize), maxSize))
  }

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return (
    <div ref={containerRef} className="flex h-full">
      <div style={{ width: `${size}%` }} className="overflow-hidden">
        {children[0]}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div style={{ width: `${100 - size}%` }} className="overflow-hidden">
        {children[1]}
      </div>
    </div>
  )
}

