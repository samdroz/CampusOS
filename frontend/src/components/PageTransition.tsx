import React, { useState, useEffect, useRef } from 'react';

interface PageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ pageKey, children }) => {
  const [prevProps, setPrevProps] = useState({ pageKey, children });
  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    outgoing: React.ReactNode;
    current: React.ReactNode;
  }>({
    isTransitioning: false,
    outgoing: null,
    current: children,
  });

  const latestChildrenRef = useRef<React.ReactNode>(children);
  latestChildrenRef.current = children;

  // 1. Detect genuine page navigation synchronously during render
  if (pageKey !== prevProps.pageKey) {
    const outgoingContent = transitionState.current;
    setPrevProps({ pageKey, children });
    setTransitionState({
      isTransitioning: true,
      outgoing: outgoingContent,
      current: children,
    });
  } else if (children !== prevProps.children && !transitionState.isTransitioning) {
    // Keep current content in sync with background data updates on the same page
    setPrevProps({ pageKey, children });
    setTransitionState((prev) => ({
      ...prev,
      current: children,
    }));
  }

  // 2. Smooth 200ms page cross-fade and slide lifecycle
  // Animate only the page content without any content-covering overlays or blocking screens.
  useEffect(() => {
    if (!transitionState.isTransitioning) return;

    // Reset scroll of the scrollable <main> container to top for the destination page
    const mainEl = document.querySelector('main');
    if (mainEl && mainEl.scrollTop > 0) {
      mainEl.scrollTop = 0;
    }

    const timer = setTimeout(() => {
      setTransitionState({
        isTransitioning: false,
        outgoing: null,
        current: latestChildrenRef.current,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [transitionState.isTransitioning, prevProps.pageKey]);

  return (
    <div className="relative w-full min-h-full">
      {/* Outgoing Page Fade/Slide */}
      {transitionState.isTransitioning && transitionState.outgoing && (
        <div
          key={`exit-${prevProps.pageKey}`}
          className="absolute inset-0 w-full animate-nav-exit pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {transitionState.outgoing}
        </div>
      )}

      {/* Incoming Destination Page: Visible, interactive, and completely unobstructed */}
      <div
        key={`enter-${pageKey}`}
        className={transitionState.isTransitioning ? "animate-nav-enter w-full min-h-full" : "w-full min-h-full"}
      >
        {transitionState.current}
      </div>
    </div>
  );
};
