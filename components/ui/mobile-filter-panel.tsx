'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFilterPanelProps {
  children: React.ReactNode;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  title?: string;
}

export function MobileFilterPanel({
  children,
  hasActiveFilters = false,
  onClearFilters,
  collapsible = true,
  defaultCollapsed = false,
  className,
  title = 'Filters',
}: MobileFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-white bg-primary rounded-full">
              •
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="min-h-[44px] min-w-[44px] text-xs"
              aria-label="Clear all filters"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="min-h-[44px] min-w-[44px] md:hidden"
              aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          collapsible && 'md:!max-h-none'
        )}
        style={{
          maxHeight:
            collapsible && isCollapsed ? 0 : contentHeight ? `${contentHeight}px` : 'none',
        }}
      >
        <div ref={contentRef} className="p-4">
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
