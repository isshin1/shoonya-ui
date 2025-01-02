import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent as ShadcnCardContent, CardFooter } from "@/components/ui/card"

interface CardContentProps {
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function CardContent({
  title,
  description,
  children,
  footer,
  className = "",
}: CardContentProps) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <ShadcnCardContent>{children}</ShadcnCardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  )
}

