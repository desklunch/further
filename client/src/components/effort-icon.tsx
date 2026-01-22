interface EffortIconProps {
  level: number;
  className?: string;
  "data-testid"?: string;
}

export function EffortIcon({ level, className = "", "data-testid": testId }: EffortIconProps) {
  const filledColor = "currentColor";
  const filledOpacity = 1;
  const unfilledOpacity = 0.25;

  return (
<div className=  "whitespace-nowrap inline-flex items-center rounded-sm border px-1 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground"
>
<svg
  width="14"
  height="12"
  viewBox="0 0 14 12"
  fill="none"
  className={className}
  aria-label={`Effort ${level}`}
  data-testid={testId}
>
  <rect
    x="0"
    y="9"
    width="3"
    height="3"
    rx="0.5"
    fill={filledColor}
    opacity={level >= 1 ? filledOpacity : unfilledOpacity}
  />
  <rect
    x="5.25"
    y="5"
    width="3"
    height="7"
    rx="0.5"
    fill={filledColor}
    opacity={level >= 2 ? filledOpacity : unfilledOpacity}
  />
  <rect
    x="10.5"
    y="1"
    width="3"
    height="11"
    rx="0.5"
    fill={filledColor}
    opacity={level >= 3 ? filledOpacity : unfilledOpacity}
  />
</svg></div>
  );
}
