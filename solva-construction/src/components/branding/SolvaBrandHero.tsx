import { SolvaBrandMark } from "@/components/branding/SolvaBrandMark";
import { cn } from "@/lib/utils";

export function SolvaBrandHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-solva-pine/30 bg-solva-porcelain px-6 py-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <SolvaBrandMark />
          <div>
            <div className="font-heading text-2xl text-solva-smart">
              Project planning, made practical
            </div>
            <p className="mt-1 text-sm text-solva-smart/80 max-w-2xl">
              Build your schedule, assign people, link dependencies, and snapshot progress. Designed for clear construction workflows.
            </p>
          </div>
          <p className="text-sm text-solva-wine">
            Tip: Use the Move handle to reorder tasks.
          </p>
        </div>
      </div>
    </section>
  );
}