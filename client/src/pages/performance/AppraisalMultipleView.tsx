import { ChevronDown, Download, Info, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  downloadAppraisalPdf,
  getAppraisalDetail,
  saveAppraisalRatings,
  submitAppraisalReview,
} from "../../api/performance.api";
import { useAppSelector } from "../../app/hooks";
import cannyforeLogo from "../../assets/cannyfore_title_logo.png";
import Button from "../../components/common/Button";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  AppraisalDetail,
  TemplateQuestion,
} from "../../types/performance.types";
import { getAvatarSrc } from "../../utils/avatar";
import { isAdminRole } from "../../config/roles";

type ReviewerType = "self" | "supervisor";
type RatingDraft = Record<string, { score: number; comment: string }>;

function Avatar({
  name,
  avatar,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  className?: string;
}) {
  const avatarUrl = getAvatarSrc(avatar);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-950 to-teal-500 shadow-lg ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-4xl font-bold text-white">
          {(name[0] || "E").toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SegmentScore({
  score,
  editable,
  onChange,
}: {
  score?: number;
  editable?: boolean;
  onChange?: (score: number) => void;
}) {
  const value = Math.max(0, Math.min(5, Number(score) || 0));
  return (
    <div className="flex items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map((item) => (
        <button
          key={item}
          type="button"
          disabled={!editable}
          onClick={() => onChange?.(item)}
          className={`h-[20px] w-[88px] rounded-none transition ${value >= item ? "bg-navy-700" : "bg-[#e6e6eb]"} ${editable ? "cursor-pointer hover:bg-navy-600" : "cursor-default"}`}
          aria-label={`Set rating ${item}`}
        />
      ))}
    </div>
  );
}

function formatScore(score?: number | null, empty = "--") {
  const numeric = Number(score);
  return Number.isFinite(numeric) && numeric > 0
    ? numeric.toFixed(2).replace(/\.00$/, ".0")
    : empty;
}

function formatStatus(value: string) {
  return String(value || "IN PROGRESS").replace(/_/g, " ");
}

function ratingAverage(ratings: RatingDraft) {
  const scores = Object.values(ratings)
    .map((rating) => Number(rating.score))
    .filter((score) => Number.isFinite(score) && score > 0);
  if (!scores.length) return 0;
  return Number(
    (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2),
  );
}
function questionWeight(question: TemplateQuestion, total: number) {
  if (Number(question.weight) > 0)
    return Number(question.weight).toFixed(1).replace(/\.0$/, "");
  return (Math.round((100 / Math.max(total, 1)) * 10) / 10).toFixed(1);
}

function TemplateHeader({ header }: { header?: string }) {
  const hasHtml = /<[a-z][\s\S]*>/i.test(header || "");

  if (hasHtml) {
    return (
      <div
        className="appraisal-template-header text-slate-600 [&_img]:mx-auto [&_img]:mb-7 [&_img]:max-h-[320px] [&_img]:max-w-[72%] [&_img]:object-contain [&_p]:my-2 [&_p]:text-center"
        dangerouslySetInnerHTML={{ __html: header || "" }}
      />
    );
  }

  const lines = String(header || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="text-slate-600">
      <img
        src={cannyforeLogo}
        alt="Company logo"
        className="mx-auto mb-7 max-h-[260px] max-w-[64%] object-contain"
      />
      {lines.map((line, index) => (
        <p
          key={`${line}-${index}`}
          className={
            index === 0
              ? "text-center text-lg font-semibold"
              : "text-sm leading-6"
          }
        >
          {line}
        </p>
      ))}
    </div>
  );
}

export default function AppraisalMultipleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [appraisal, setAppraisal] = useState<AppraisalDetail | null>(null);
  const [ratings, setRatings] = useState<RatingDraft>({});
  const [commentQuestion, setCommentQuestion] =
    useState<TemplateQuestion | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    getAppraisalDetail(id)
      .then((detail) => {
        setAppraisal(detail);
        const supervisorReview =
          Boolean(detail.mainEvaluator?.id) &&
          String(user?.id) === String(detail.mainEvaluator?.id);
        const type: ReviewerType =
          supervisorReview && detail.mainEvaluator ? "supervisor" : "self";
        setRatings(
          Object.fromEntries(
            detail.questions.map((question) => [
              question.id,
              {
                score:
                  type === "supervisor"
                    ? question.supervisorScore
                    : question.selfScore,
                comment:
                  type === "supervisor"
                    ? question.supervisorComment || ""
                    : question.selfComment || "",
              },
            ]),
          ),
        );
      })
      .catch(() => setAppraisal(null));
  }, [id, user?.id, user?.role]);

  const isPerformanceAdmin = isAdminRole(user?.role);
  const pageTitle = isPerformanceAdmin
    ? "Performance / Appraisals / Appraisal List"
    : "Performance / Appraisals / My Appraisal List";
  const activeTab = isPerformanceAdmin ? "Appraisal List" : "My Appraisals";

  const isSelfReviewer =
    Boolean(appraisal?.employee?.id) &&
    String(user?.id) === String(appraisal?.employee?.id);
  const isAssignedEvaluator =
    Boolean(appraisal?.mainEvaluator?.id) &&
    String(user?.id) === String(appraisal?.mainEvaluator?.id);
  const reviewerType: ReviewerType =
    appraisal && isAssignedEvaluator && appraisal.mainEvaluator
      ? "supervisor"
      : "self";

  // Live rating — recalculates on every segment click
  const visibleRating = useMemo(() => ratingAverage(ratings), [ratings]);

  if (!appraisal) {
    return (
      <PerformanceLayout title={pageTitle} activeTab={activeTab}>
        <div className="rounded-[8px] bg-white p-8 text-sm font-semibold text-slate-500">
          Loading appraisal...
        </div>
      </PerformanceLayout>
    );
  }

  const employee = appraisal.employee;
  const evaluator =
    reviewerType === "supervisor" ? appraisal.mainEvaluator : employee;
  const canEdit =
    reviewerType === "supervisor"
      ? isAssignedEvaluator && !appraisal.supervisorSubmitted
      : isSelfReviewer && !appraisal.selfSubmitted;
  const reviewWeight =
    reviewerType === "supervisor"
      ? appraisal.supervisorWeight
      : appraisal.selfWeight;

  const bothSubmitted =
    appraisal.selfSubmitted && appraisal.supervisorSubmitted;
  const finalRatingValue = bothSubmitted
    ? appraisal.finalRating || appraisal.supervisorRating || 0
    : 0;

  const ratingPayload = appraisal.questions.map((question) => ({
    questionId: question.id,
    score: ratings[question.id]?.score || 0,
    comment: ratings[question.id]?.comment || "",
  }));

  const setQuestionRating = (questionId: string, score: number) => {
    setRatings((current) => ({
      ...current,
      [questionId]: { score, comment: current[questionId]?.comment || "" },
    }));
  };

  const setQuestionComment = (questionId: string, comment: string) => {
    setRatings((current) => ({
      ...current,
      [questionId]: { score: current[questionId]?.score || 0, comment },
    }));
  };

  const saveDraft = async () => {
    if (!id) return;
    const detail = await saveAppraisalRatings(id, {
      reviewerType,
      ratings: ratingPayload,
    });
    setAppraisal(detail);
    setMessage("Saved.");
  };

  const submit = async () => {
    if (!id) return;
    const detail = await submitAppraisalReview(id, {
      reviewerType,
      ratings: ratingPayload,
    });
    setAppraisal(detail);
    setMessage(
      reviewerType === "supervisor"
        ? "Final review submitted."
        : "Self review submitted.",
    );
  };

  return (
    <PerformanceLayout title={pageTitle} activeTab={activeTab}>
      <div className="mx-auto min-h-[760px] max-w-[1500px] rounded-[24px] bg-white px-8 py-8 shadow-sm">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-5">
          <h1 className="text-xl font-bold text-slate-600">
            {reviewerType === "supervisor" ? "Final Review" : "Self Review"}
          </h1>
          <ChevronDown size={20} className="rotate-180 text-slate-500" />
        </div>

        <div className="rounded-[2px] bg-white">
          <TemplateHeader header={appraisal.template.header} />
        </div>

        <div className="mt-10 grid grid-cols-[280px_1fr] gap-8 border-b border-slate-200 pb-8">
          <div className="text-center">
            <Avatar
              name={employee.name}
              avatar={employee.avatar}
              className="mx-auto h-[180px] w-[180px]"
            />
            {/* Live rating — updates on every segment click */}
            <p className="mt-7 text-6xl font-medium text-navy-700">
              {formatScore(visibleRating)}
            </p>
            <p className="mt-1 text-sm font-bold text-navy-700">Rating</p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-10 pt-3 text-slate-500">
            <Field label="Employee" value={employee.name} />
            <Field label="Status" value={formatStatus(appraisal.status)} />
            <div>
              <p className="mb-4 text-xs">Evaluator:</p>
              <button
                type="button"
                className="flex w-full items-center justify-between border-b border-slate-300 pb-5 text-left text-lg text-slate-500"
              >
                <span>
                  {reviewerType === "supervisor"
                    ? `${evaluator?.name || "-"} (Final Review)`
                    : `${employee.name} (Self)`}
                </span>
                <ChevronDown size={18} />
              </button>
            </div>
            <div>
              <p className="mb-4 text-xs">Due Date:</p>
              <p className="border-b border-slate-300 pb-5 text-lg text-slate-500">
                {appraisal.dueDate}
              </p>
            </div>
            {/* Final Rating — only visible after both sides submit */}
            <div className="col-span-2">
              <p className="mb-2 text-xs font-medium text-navy-700">
                Final Rating
              </p>
              <p className="border-b border-dotted border-slate-300 pb-5 text-2xl font-bold text-navy-700">
                {bothSubmitted ? (
                  formatScore(finalRatingValue)
                ) : (
                  <span className="text-base font-normal text-slate-400">
                    Available after both reviews are submitted
                  </span>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <p className="mb-12 text-sm font-medium text-navy-700">Comment</p>
              <div className="border-b border-dotted border-slate-300" />
            </div>
          </div>
        </div>

        <section className="border-b border-slate-200 py-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-600">KPIss</h2>
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              {/* Live running average next to KPIs header */}
              <span>{formatScore(visibleRating)}</span>
              <ChevronDown size={18} className="rotate-180" />
            </div>
          </div>
          <div className="flex max-w-[520px] items-center gap-4">
            <div className="h-3 flex-1 rounded-full bg-orange-500" />
            <span className="text-lg font-bold text-slate-500">
              {reviewWeight + 50}%
            </span>
          </div>
        </section>

        <section className="py-6">
          <h3 className="mb-6 text-lg font-bold text-slate-600">KPI's</h3>
          <div className="space-y-0">
            {appraisal.questions.map((question) => {
              const current = ratings[question.id]?.score || 0;
              const comment = ratings[question.id]?.comment || "";
              const weight = questionWeight(
                question,
                appraisal.questions.length,
              );

              return (
                <article
                  key={question.id}
                  className="border-b border-slate-200 py-7"
                >
                  <div className="mb-6 flex items-start gap-2 text-sm font-medium text-slate-500">
                    <Info
                      size={19}
                      className="mt-0.5 flex-none rounded-full bg-slate-500 p-[3px] text-white"
                    />
                    <span>{question.displayText}</span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-navy-700">
                    Rating:
                  </p>
                  <div className="flex items-start gap-8">
                    <div>
                      <SegmentScore
                        score={current}
                        editable={canEdit}
                        onChange={(score) =>
                          setQuestionRating(question.id, score)
                        }
                      />
                      <p className="mt-1 text-base text-slate-500">
                        {formatScore(current, "0.0")}
                      </p>
                    </div>
                    <span className="pt-1 text-sm font-medium text-slate-500">
                      {weight}%
                    </span>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-5">
                    <div className="min-h-[54px] flex-1">
                      <p className="mb-6 text-base text-slate-500">Comment:</p>
                      {comment ? (
                        <p className="text-lg text-slate-500">{comment}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      title="Add comment"
                      onClick={() => setCommentQuestion(question)}
                      className={`grid h-10 w-10 place-items-center rounded-full ${comment ? "bg-[#e9eef8] text-navy-700" : "bg-[#f2f4f8] text-slate-400"}`}
                    >
                      <MessageCircle size={19} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="sticky bottom-0 mt-3 flex justify-end gap-2 border-t border-slate-100 bg-white py-5">
          {message ? (
            <span className="mr-auto self-center text-sm font-semibold text-emerald-600">
              {message}
            </span>
          ) : null}
          <Button
            onClick={() => downloadAppraisalPdf(appraisal.id, employee.name)}
          >
            <Download size={16} />
            Download
          </Button>
          <Button disabled={!canEdit} onClick={submit}>
            Submit
          </Button>
          <Button disabled={!canEdit} onClick={saveDraft}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      {commentQuestion ? (
        <CommentModal
          question={commentQuestion}
          comment={ratings[commentQuestion.id]?.comment || ""}
          onChange={(comment) =>
            setQuestionComment(commentQuestion.id, comment)
          }
          onClose={() => setCommentQuestion(null)}
          onSave={async () => {
            await saveDraft();
            setCommentQuestion(null);
          }}
        />
      ) : null}
    </PerformanceLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-4 text-xs">{label}:</p>
      <p className="border-b border-dotted border-slate-300 pb-5 text-lg text-slate-500">
        {value}
      </p>
    </div>
  );
}

function CommentModal({
  question,
  comment,
  onChange,
  onClose,
  onSave,
}: {
  question: TemplateQuestion;
  comment: string;
  onChange: (comment: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/55 pt-24"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-[900px] rounded-[20px] bg-white px-6 py-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 grid h-8 w-8 place-items-center rounded-full bg-slate-300 text-white"
        >
          <X size={18} />
        </button>
        <h2 className="text-xl font-bold text-slate-600">
          Appraisal Comments and Answers
        </h2>
        <p className="mt-2 max-w-[820px] text-lg font-medium leading-8 text-slate-400">
          ({question.displayText})
        </p>
        <div className="mt-4 border-t border-slate-200 pt-5">
          <div className="text-sm font-bold text-slate-500">
            <span className="mb-3 flex items-center gap-2">
              <MessageCircle size={17} />
              Comment
            </span>
            <textarea
              value={comment}
              onChange={(event) => onChange(event.target.value)}
              className="min-h-[140px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none focus:border-navy-700"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
