import solvaLogo from "@/assets/solva_logo.png";
import { cn } from "@/lib/utils";

type SolvaBrandMarkVariant = "default" | "compact";

export function SolvaBrandMark({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: SolvaBrandMarkVariant;
}) {
  const isCompact = variant === "compact";

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <img
        src={solvaLogo}
        alt="Solva"
        className={cn(
          "block select-none",
          isCompact ? "h-16 w-16" : "h-56 w-56",
        )}
        draggable={false}
      />
      <div
        className={cn(
          "flex items-center justify-center",
          "font-label uppercase tracking-[0.18em]",
          "text-solva-smart",
          isCompact ? "text-[18px] h-16" : "text-[32px] h-56",
        )}
        style={{ lineHeight: 1 }}
      >
        Construction
      </div>
    </div>
  );
}
