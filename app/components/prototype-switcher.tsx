import { useNavigate, useSearchParams } from "react-router";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PrototypeSwitcherProps {
  variants: { id: string; name: string }[];
  current: string;
}

export function PrototypeSwitcher({
  variants,
  current,
}: PrototypeSwitcherProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentIndex = variants.findIndex((v) => v.id === current);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;
  const currentVariant = variants[activeIndex] ?? variants[0];

  function setVariant(id: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("variant", id);
    navigate(`?${nextParams.toString()}`, { replace: true });
  }

  function prev() {
    const nextIndex = (activeIndex - 1 + variants.length) % variants.length;
    setVariant(variants[nextIndex].id);
  }

  function next() {
    const nextIndex = (activeIndex + 1) % variants.length;
    setVariant(variants[nextIndex].id);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      if (isInput) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, variants]);

  // Hide in production builds if desired, but in dev provide the interactive switch pill
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <aside
      aria-label="Prototype Variant Switcher"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/95 px-3 py-1.5 text-xs font-medium text-white shadow-2xl backdrop-blur select-none"
    >
      <button
        onClick={prev}
        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        title="Previous variant (←)"
        aria-label="Previous variant"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-1.5 px-2">
        <span className="font-semibold text-amber-400">PROTOTYPE:</span>
        <span className="text-neutral-200">
          <strong className="text-white">{currentVariant.id}</strong> —{" "}
          {currentVariant.name}
        </span>
        <span className="ml-1 text-[10px] text-neutral-400">
          ({activeIndex + 1}/{variants.length})
        </span>
      </div>

      <button
        onClick={next}
        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        title="Next variant (→)"
        aria-label="Next variant"
      >
        <ChevronRight className="size-4" />
      </button>
    </aside>
  );
}
