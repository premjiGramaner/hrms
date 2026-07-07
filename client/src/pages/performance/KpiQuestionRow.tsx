import { ArrowDown, ArrowUp, Edit, Trash2 } from "lucide-react";
import { TemplateQuestion } from "../../types/performance.types";

type Props = {
  question: TemplateQuestion;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function KpiQuestionRow({
  question,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="grid min-h-[52px] grid-cols-[64px_1fr_88px] items-center bg-[#eeecef] px-3 text-sm font-semibold text-slate-500 shadow-sm">
      <div className="flex items-center gap-1 text-slate-500">
        <button
          type="button"
          disabled={isFirst}
          onClick={onMoveUp}
          className="disabled:opacity-20"
          title="Move up"
        >
          <ArrowUp size={24} />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={onMoveDown}
          className="disabled:opacity-20"
          title="Move down"
        >
          <ArrowDown size={24} />
        </button>
      </div>
      <button type="button" onClick={onEdit} className="truncate text-left">
        {question.displayText}
      </button>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onEdit}
          title="Edit KPI"
          className="text-slate-500 hover:text-navy-700"
        >
          <Edit size={20} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete KPI"
          className="text-slate-500 hover:text-navy-700"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
