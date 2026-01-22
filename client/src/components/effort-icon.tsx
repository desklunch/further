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
        y="8"
        width="3.5"
        height="4"
        rx="0.5"
        fill={filledColor}
        opacity={level >= 1 ? filledOpacity : unfilledOpacity}
      />
      <rect
        x="5.25"
        y="4"
        width="3.5"
        height="8"
        rx="0.5"
        fill={filledColor}
        opacity={level >= 2 ? filledOpacity : unfilledOpacity}
      />
      <rect
        x="10.5"
        y="0"
        width="3.5"
        height="12"
        rx="0.5"
        fill={filledColor}
        opacity={level >= 3 ? filledOpacity : unfilledOpacity}
      />
    </svg>
  );
}
