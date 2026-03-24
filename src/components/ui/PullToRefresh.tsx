import { useState, useRef, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface PullToRefreshProps {
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 80;

const PullToRefresh = ({ children, className = "" }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Prevent native pull-to-refresh on the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventNative = (e: TouchEvent) => {
      if (isPulling.current && pullDistance > 0) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", preventNative, { passive: false });
    return () => el.removeEventListener("touchmove", preventNative);
  }, [pullDistance]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (el && el.scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
    } else {
      startY.current = null;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 10) {
      isPulling.current = true;
      setPullDistance(Math.min((delta - 10) * 0.5, THRESHOLD * 1.5));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    isPulling.current = false;
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      await queryClient.invalidateQueries();
      await new Promise(r => setTimeout(r, 400));
      setRefreshing(false);
    }
    setPullDistance(0);
    startY.current = null;
  }, [pullDistance, refreshing, queryClient]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: refreshing ? 48 : pullDistance > 5 ? pullDistance : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-muted-foreground transition-transform ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${progress * 360}deg)`, opacity: progress }}
        />
      </div>

      {children}
    </div>
  );
};

export default PullToRefresh;
