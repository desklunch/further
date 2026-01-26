interface PriorityIconProps {
  level: number;
  className?: string;
  "data-testid"?: string;
}

export function PriorityIcon({
  level,
  className = "",
  "data-testid": testId,
}: PriorityIconProps) {
  const filledColor = "currentColor";
  const filledOpacity = 1;
  const unfilledOpacity = 0.3;

  return (
    <div className="whitespace-nowrap inline-flex items-center rounded-sm p-0 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ">
      <svg
        width="10"
        height="12"
        viewBox="0 0 10 12"
        fill="none"
        className={className}
        aria-label={`Priority ${level}`}
        data-testid={testId}
      >
        <rect
          x="0"
          y="0"
          width="10"
          height="3"
          rx="0.5"
          fill={filledColor}
          opacity={level >= 3 ? filledOpacity : unfilledOpacity}
        />
        <rect
          x="0"
          y="4.5"
          width="10"
          height="3"
          rx="0.5"
          fill={filledColor}
          opacity={level >= 2 ? filledOpacity : unfilledOpacity}
        />
        <rect
          x="0"
          y="9"
          width="10"
          height="3"
          rx="0.5"
          fill={filledColor}
          opacity={level >= 1 ? filledOpacity : unfilledOpacity}
        />
      </svg>
    </div>
  );
}
