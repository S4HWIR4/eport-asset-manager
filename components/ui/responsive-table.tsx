"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  mobileCardView?: boolean;
}

/**
 * ResponsiveTable wrapper component for mobile optimization
 * 
 * Provides:
 * - Horizontal scroll for table content on mobile
 * - Maintains vertical page scroll
 * - Touch-friendly scroll indicators
 * - Prevents horizontal page overflow
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 4.1, 4.2
 */
function ResponsiveTable({ 
  children, 
  className,
  mobileCardView = false 
}: ResponsiveTableProps) {
  return (
    <div
      data-testid="responsive-table-wrapper"
      className={cn(
        // Base container styles
        "relative w-full",
        // Horizontal scroll for table content
        "overflow-x-auto",
        // Touch-friendly scrolling on mobile
        "[-webkit-overflow-scrolling:touch]",
        // Scroll indicators (webkit scrollbar styling)
        "[&::-webkit-scrollbar]:h-2",
        "[&::-webkit-scrollbar-track]:bg-muted/20",
        "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
        // Ensure no horizontal page overflow
        "max-w-full",
        className
      )}
    >
      {children}
    </div>
  )
}

export { ResponsiveTable }
export type { ResponsiveTableProps }
