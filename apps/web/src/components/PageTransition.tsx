import { useEffect, useRef, useState, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  viewKey: string;
}

type Phase = "show" | "fade-out" | "fade-in";

export function PageTransition({ children, viewKey }: PageTransitionProps) {
  const [phase, setPhase] = useState<Phase>("show");
  const [displayedChildren, setDisplayedChildren] = useState<ReactNode>(children);
  const keyRef = useRef(viewKey);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* When viewKey changes, trigger the fade-out → fade-in sequence */
  useEffect(() => {
    if (viewKey === keyRef.current) return;
    keyRef.current = viewKey;

    // Phase 1: fade out current content
    setPhase("fade-out");

    // Fallback: if onAnimationEnd doesn't fire (e.g. in jsdom),
    // proceed after the animation duration
    timerRef.current = setTimeout(() => {
      setDisplayedChildren(children);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("fade-in");

          timerRef.current = setTimeout(() => {
            setPhase("show");
          }, 350);
        });
      });
    }, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [viewKey]);

  /* After fade-out animation ends, swap children and start fade-in */
  const handleAnimationEnd = () => {
    // Clear the fallback timer if animation fired
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (phase === "fade-out") {
      setDisplayedChildren(children);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("fade-in");
        });
      });
    } else if (phase === "fade-in") {
      setPhase("show");
    }
  };

  return (
    <>
      <style>{`
        @keyframes pt-fade-out {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes pt-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pt-wrapper {
          position: relative;
        }
        .pt-child {
          opacity: 1;
          transform: translateY(0);
        }
        .pt-fade-out .pt-child {
          animation: pt-fade-out 150ms ease-out both;
        }
        .pt-fade-in .pt-child {
          animation: pt-fade-in 300ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
      `}</style>

      <div className={`pt-wrapper pt-${phase}`} onAnimationEnd={handleAnimationEnd}>
        <div className="pt-child">{displayedChildren}</div>
      </div>
    </>
  );
}
