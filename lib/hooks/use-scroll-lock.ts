'use client';

import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '../mobile-utils';

/**
 * Hook to lock/unlock body scroll
 * Useful for modal dialogs and overlays
 * 
 * @param isLocked - Whether scroll should be locked
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen }: { isOpen: boolean }) {
 *   useScrollLock(isOpen);
 *   
 *   if (!isOpen) return null;
 *   
 *   return <div>Modal content</div>;
 * }
 * ```
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
  }, [isLocked]);
}
