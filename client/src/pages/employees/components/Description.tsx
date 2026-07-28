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
      <span
        title={description}
        className="text-slate-600 text-[13px] cursor-pointer"
      >
        {descriptionPreview}
      </span>
      <div className="absolute left-0 top-full z-50 mt-2 hidden w-64 break-all whitespace-normal rounded-lg border border-slate-200 bg-white p-3 text-[13px] text-slate-700 shadow-lg group-hover:block">
        {description}
      </div>
    </div>
  );
}

export default DescriptionCell;
