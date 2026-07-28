import type { MouseEvent } from "react";

const RATING_SEGMENTS = [1, 2, 3, 4, 5] as const;

interface RatingSegmentControlProps {
  score?: number;
  editable?: boolean;
  onChange?: (score: number) => void;
  segmentClassName: string;
}

export default function RatingSegmentControl({
  score,
  editable = false,
  onChange,
  segmentClassName,
}: RatingSegmentControlProps) {
  const value = Math.max(0, Math.min(5, Number(score) || 0));

  const selectRating = (
    event: MouseEvent<HTMLButtonElement>,
    segment: number,
  ) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    const clickedLeftHalf = event.clientX - left < width / 2;
    const selectedRating = clickedLeftHalf ? segment - 0.5 : segment;
    onChange?.(value === selectedRating ? 0 : selectedRating);
  };

  return (
    <div
      className="flex items-center gap-[3px]"
      role="group"
      aria-label="KPI rating"
    >
      {RATING_SEGMENTS.map((segment) => {
        const fillPercentage =
          value >= segment ? 100 : value >= segment - 0.5 ? 50 : 0;

        return (
          <button
            key={segment}
            type="button"
            disabled={!editable}
            onClick={(event) => selectRating(event, segment)}
            className={`${segmentClassName} rounded-none transition-opacity ${
              editable
                ? "cursor-pointer hover:opacity-80"
                : "cursor-default"
            }`}
            style={{
              background: `linear-gradient(to right, #1b2a6b 0%, #1b2a6b ${fillPercentage}%, #e6e6eb ${fillPercentage}%, #e6e6eb 100%)`,
            }}
            aria-label={`Set rating ${segment - 0.5} or ${segment}`}
            aria-pressed={value === segment - 0.5 || value === segment}
            title={
              editable
                ? `${(segment - 0.5).toFixed(1)} on the left, ${segment.toFixed(1)} on the right`
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
