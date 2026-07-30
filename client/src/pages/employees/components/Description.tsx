interface DescriptionCellProps {
  description?: string | null;
}

export function DescriptionCell({ description }: DescriptionCellProps) {
  if (!description) {
    return (
      <span className="text-slate-300 text-[12.5px] italic">
        No description
      </span>
    );
  }
  const DESCRIPTION_PREVIEW_LENGTH = 10;
  const descriptionPreview =
    description.length > DESCRIPTION_PREVIEW_LENGTH
      ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}...`
      : description;
  return (
    <div className="relative inline-block group">
      <span className="text-slate-600 text-[13px] cursor-pointer">
        {descriptionPreview}
      </span>
      <div className="absolute left-0 top-full z-[9999] mt-2 hidden w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white p-3 text-[13px] text-slate-700 shadow-xl group-hover:block break-words">
        <div className="max-h-60 overflow-y-auto">{description}</div>
      </div>
    </div>
  );
}

export default DescriptionCell;
