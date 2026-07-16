import { Check, Info, MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getAppraisalDetail,
  saveAppraisalRatings,
  submitAppraisalReview,
} from "../../api/performance.api";
import { useAppSelector } from "../../app/hooks";
import Button from "../../components/common/Button";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import {
  AppraisalDetail,
  TemplateQuestion,
} from "../../types/performance.types";
import { getAvatarSrc } from "../../utils/avatar";

type ReviewerType = "self" | "supervisor";
type RatingDraft = Record<
  string,
  {
    self: number;
    supervisor: number;
    selfComment: string;
    supervisorComment: string;
  }
>;

function calcAverage(scores: number[]): number {
  const valid = scores.filter((s) => Number.isFinite(s) && s > 0);
  if (!valid.length) return 0;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

function formatScore(score?: number | null, empty = "--") {
  const v = Number(score);
  return Number.isFinite(v) && v > 0 ? v.toFixed(2) : empty;
}

function scoreForReviewer(
  r: RatingDraft[string] | undefined,
  reviewer: ReviewerType,
) {
  return reviewer === "supervisor" ? r?.supervisor || 0 : r?.self || 0;
}

function commentForReviewer(
  r: RatingDraft[string] | undefined,
  reviewer: ReviewerType,
) {
  return reviewer === "supervisor"
    ? r?.supervisorComment || ""
    : r?.selfComment || "";
}

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const avatarUrl = getAvatarSrc(avatar);

  return (
    <div className="relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-950 to-teal-500 shadow-lg">
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
          className={`h-[9px] w-[38px] rounded-none ${value >= item ? "bg-navy-700" : "bg-[#e6e6eb]"} ${editable ? "cursor-pointer hover:bg-navy-600" : "cursor-default"}`}
          aria-label={`Set rating ${item}`}
        />
      ))}
    </div>
  );
}

function ReviewerPanel({
  title,
  name,
  avatar,
  liveRating,
  submitted,
}: {
  title: string;
  name: string;
  avatar?: string | null;
  liveRating: number;
  submitted: boolean;
}) {
  return (
    <div className="border-l border-slate-100 text-center">
      <h3 className="mb-4 text-lg font-bold text-slate-700">{title}</h3>
      <Avatar name={name} avatar={avatar} />

      <button
        type="button"
        className="mt-2 inline-flex items-center gap-2 rounded-[2px] bg-gradient-to-r from-blue-900 to-teal-600 px-7 py-2.5 text-base font-bold text-white shadow-md transition-all hover:opacity-90"
      >
        {name}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1 text-2xl font-semibold text-slate-500">
        <span>{formatScore(liveRating)}</span>
        {submitted && liveRating > 0 ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-400 text-white">
            <Check size={18} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="flex items-center gap-4 px-4">
      <div className="h-3 flex-1 rounded-full bg-orange-500" />
      <span className="text-lg font-bold text-slate-500">{weight}%</span>
    </div>
  );
}

function KeyPerformanceIndicatorRatingCell({
  question,
  totalQuestions,
  score,
  comment,
  editable,
  onScore,
  onComment,
}: {
  question: TemplateQuestion;
  totalQuestions: number;
  score: number;
  comment: string;
  editable: boolean;
  onScore: (score: number) => void;
  onComment: () => void;
}) {
  const weight = question.weight
    ? `${question.weight}%`
    : `${Math.round((100 / Math.max(totalQuestions, 1)) * 10) / 10}%`;
  return (
    <div className="flex items-center gap-3 border-l border-slate-100 py-3 pl-4">
      <div>
        <SegmentScore score={score} editable={editable} onChange={onScore} />
        <p className="mt-1 text-lg font-medium text-slate-600">
          {Number(score || 0).toFixed(1)}
        </p>
      </div>
      <span className="ml-auto text-sm font-semibold text-slate-500">
        {weight}
      </span>
      <button
        type="button"
        title="Comments"
        onClick={onComment}
        className={`grid h-10 w-10 place-items-center rounded-full ${comment ? "bg-[#e9eef8] text-navy-700" : "bg-[#f2f4f8] text-slate-400"}`}
      >
        <MessageCircle size={19} />
      </button>
    </div>
  );
}

function CommentModal({
  question,
  reviewer,
  comment,
  editable,
  onChange,
  onClose,
  onSave,
}: {
  question: TemplateQuestion;
  reviewer: ReviewerType;
  comment: string;
  editable: boolean;
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
        onMouseDown={(e) => e.stopPropagation()}
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
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {reviewer === "supervisor" ? "Final Review" : "Self"}
        </p>
        <p className="mt-2 max-w-[820px] text-lg font-medium leading-8 text-slate-400">
          ({question.displayText})
        </p>
        <div className="mt-4 border-t border-slate-200 pt-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-500">
            <MessageCircle size={17} />
            Comment
          </p>
          <textarea
            value={comment}
            readOnly={!editable}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[140px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none focus:border-navy-700"
          />
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!editable} onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppraisalCompactView() {
  const { id } = useParams();
  const user = useAppSelector((state) => state.auth.user);
  const [appraisal, setAppraisal] = useState<AppraisalDetail | null>(null);
  const [ratings, setRatings] = useState<RatingDraft>({});
  const [commentTarget, setCommentTarget] = useState<{
    question: TemplateQuestion;
    reviewer: ReviewerType;
  } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    getAppraisalDetail(id)
      .then((detail) => {
        setAppraisal(detail);
        setRatings(
          Object.fromEntries(
            detail.questions.map((q) => [
              q.id,
              {
                self: q.selfScore || 0,
                supervisor: q.supervisorScore || 0,
                selfComment: q.selfComment || "",
                supervisorComment: q.supervisorComment || "",
              },
            ]),
          ),
        );
      })
      .catch(() => setAppraisal(null));
  }, [id]);

  const isPerformanceAdmin =
    user?.role === "hradmin" || user?.role === "empmanager";
  const pageTitle = isPerformanceAdmin
    ? "Performance / Appraisals / Appraisal List"
    : "Performance / Appraisals / My Appraisal List";
  const activeTab = isPerformanceAdmin ? "Appraisal List" : "My Appraisals";
  const isSelfReviewer = useMemo(
    () =>
      Boolean(appraisal?.employee?.id) &&
      String(user?.id) === String(appraisal?.employee?.id),
    [appraisal?.employee?.id, user?.id],
  );
  const isAssignedEvaluator = useMemo(
    () =>
      Boolean(appraisal?.mainEvaluator?.id) &&
      String(user?.id) === String(appraisal?.mainEvaluator?.id),
    [appraisal?.mainEvaluator?.id, user?.id],
  );

  const activeReviewer: ReviewerType = useMemo(() => {
    if (isAssignedEvaluator) return "supervisor";
    return "self";
  }, [isAssignedEvaluator]);

  const liveSupervisorRating = useMemo(
    () => calcAverage(Object.values(ratings).map((r) => r.supervisor)),
    [ratings],
  );
  const liveSelfRating = useMemo(
    () => calcAverage(Object.values(ratings).map((r) => r.self)),
    [ratings],
  );

  if (!appraisal) {
    return (
      <PerformanceLayout title={pageTitle} activeTab={activeTab}>
        <div className="rounded-[8px] bg-white p-8 text-sm font-semibold text-slate-500">
          Loading appraisal...
        </div>
      </PerformanceLayout>
    );
  }

  const supervisor = appraisal.mainEvaluator;
  const employee = appraisal.employee;
  const showMultipleView = isPerformanceAdmin || isAssignedEvaluator;

  const canEditSupervisor =
    isAssignedEvaluator &&
    Boolean(supervisor) &&
    !appraisal.supervisorSubmitted;
  const canEditSelf = isSelfReviewer && !appraisal.selfSubmitted;
  const canEditActiveReviewer =
    activeReviewer === "supervisor" ? canEditSupervisor : canEditSelf;

  const bothSubmitted =
    appraisal.selfSubmitted && appraisal.supervisorSubmitted;
  const finalRating = bothSubmitted
    ? appraisal.finalRating || appraisal.supervisorRating || 0
    : 0;

  const ratingPayload = appraisal.questions.map((q) => ({
    questionId: q.id,
    score: scoreForReviewer(ratings[q.id], activeReviewer),
    comment: commentForReviewer(ratings[q.id], activeReviewer),
  }));

  const setQuestionRating = (
    questionId: string,
    reviewer: ReviewerType,
    score: number,
  ) => {
    setRatings((cur) => ({
      ...cur,
      [questionId]: {
        self: cur[questionId]?.self || 0,
        supervisor: cur[questionId]?.supervisor || 0,
        selfComment: cur[questionId]?.selfComment || "",
        supervisorComment: cur[questionId]?.supervisorComment || "",
        [reviewer]: score,
      },
    }));
  };

  const setQuestionComment = (
    questionId: string,
    reviewer: ReviewerType,
    comment: string,
  ) => {
    setRatings((cur) => ({
      ...cur,
      [questionId]: {
        self: cur[questionId]?.self || 0,
        supervisor: cur[questionId]?.supervisor || 0,
        selfComment: cur[questionId]?.selfComment || "",
        supervisorComment: cur[questionId]?.supervisorComment || "",
        [reviewer === "supervisor" ? "supervisorComment" : "selfComment"]:
          comment,
      },
    }));
  };

  const saveDraft = async () => {
    if (!id) return;
    const detail = await saveAppraisalRatings(id, {
      reviewerType: activeReviewer,
      ratings: ratingPayload,
    });
    setAppraisal(detail);
    setMessage("Draft saved.");
  };

  const submit = async () => {
    if (!id) return;
    const detail = await submitAppraisalReview(id, {
      reviewerType: activeReviewer,
      ratings: ratingPayload,
    });
    setAppraisal(detail);
    setMessage(
      activeReviewer === "supervisor"
        ? "Final review submitted."
        : "Self review submitted.",
    );
  };

  return (
    <PerformanceLayout title={pageTitle} activeTab={activeTab}>
      <div className="mx-auto min-h-[760px] max-w-[1420px] rounded-[8px] bg-white px-8 py-5">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="rounded-full bg-[#fff1ec] px-7 py-2 text-sm font-semibold text-navy-700 shadow-sm">
            {appraisal.description}
          </div>
        </div>

        <div className={showMultipleView ? "max-w-[980px]" : "max-w-[690px]"}>
          <div
            className={`grid ${showMultipleView ? "grid-cols-[300px_1fr_1fr]" : "grid-cols-[320px_1fr]"} items-end border-b border-slate-100 pb-8`}
          >
            <div>
              <p className="text-6xl font-bold leading-none text-navy-700">
                {formatScore(finalRating)}
              </p>
              <p className="mt-7 text-lg font-bold text-navy-700">
                Final Rating
                {!bothSubmitted && (
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    (pending)
                  </span>
                )}
              </p>
            </div>

            <ReviewerPanel
              title="Self"
              name={employee.name}
              avatar={employee.avatar}
              liveRating={liveSelfRating}
              submitted={appraisal.selfSubmitted ?? false}
            />

            {showMultipleView ? (
              <ReviewerPanel
                title="Final Review"
                name={supervisor?.name || "No Supervisor"}
                avatar={supervisor?.avatar}
                liveRating={liveSupervisorRating}
                submitted={appraisal.supervisorSubmitted ?? false}
              />
            ) : null}
          </div>

          {/* Weight row */}
          <div
            className={`grid ${showMultipleView ? "grid-cols-[300px_1fr_1fr]" : "grid-cols-[320px_1fr]"} items-center border-b border-slate-100 py-4`}
          >
            <h2 className="text-2xl font-bold leading-tight text-navy-700">
              {employee.jobTitle || appraisal.template.jobTitle}
              <br />
              Competencies
            </h2>
            <WeightBar weight={appraisal.selfWeight + 50} />
            {showMultipleView ? (
              <WeightBar weight={appraisal.supervisorWeight + 50} />
            ) : null}
          </div>

          {/* Key Performance Indicator table */}
          <h3 className="border-b border-slate-100 py-2 text-xl font-bold text-slate-500">
            Key Performance Indicator
          </h3>
          <div>
            {appraisal.questions.map((kpi) => (
              <div
                key={kpi.id}
                className={`grid min-h-[80px] ${showMultipleView ? "grid-cols-[300px_1fr_1fr]" : "grid-cols-[320px_1fr]"} border-b border-slate-100`}
              >
                <div className="flex gap-2 py-3 pr-5 text-sm font-medium leading-[1.2] text-slate-500">
                  <Info
                    size={18}
                    className="mt-0.5 flex-none rounded-full bg-slate-400 p-[2px] text-white"
                  />
                  <span className="whitespace-pre-line break-words">
                    {kpi.displayText}
                  </span>
                </div>

                {showMultipleView ? (
                  <>
                    <KeyPerformanceIndicatorRatingCell
                      question={kpi}
                      totalQuestions={appraisal.questions.length}
                      score={scoreForReviewer(ratings[kpi.id], "self")}
                      comment={commentForReviewer(ratings[kpi.id], "self")}
                      editable={canEditSelf}
                      onScore={(score) =>
                        setQuestionRating(kpi.id, "self", score)
                      }
                      onComment={() =>
                        setCommentTarget({ question: kpi, reviewer: "self" })
                      }
                    />
                    <KeyPerformanceIndicatorRatingCell
                      question={kpi}
                      totalQuestions={appraisal.questions.length}
                      score={scoreForReviewer(ratings[kpi.id], "supervisor")}
                      comment={commentForReviewer(
                        ratings[kpi.id],
                        "supervisor",
                      )}
                      editable={canEditSupervisor}
                      onScore={(score) =>
                        setQuestionRating(kpi.id, "supervisor", score)
                      }
                      onComment={() =>
                        setCommentTarget({
                          question: kpi,
                          reviewer: "supervisor",
                        })
                      }
                    />
                  </>
                ) : (
                  <KeyPerformanceIndicatorRatingCell
                    question={kpi}
                    totalQuestions={appraisal.questions.length}
                    score={scoreForReviewer(ratings[kpi.id], "self")}
                    comment={commentForReviewer(ratings[kpi.id], "self")}
                    editable={canEditSelf}
                    onScore={(score) =>
                      setQuestionRating(kpi.id, "self", score)
                    }
                    onComment={() =>
                      setCommentTarget({ question: kpi, reviewer: "self" })
                    }
                  />
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-7 flex items-center justify-end gap-3">
            {message ? (
              <span className="mr-auto text-sm font-semibold text-emerald-600">
                {message}
              </span>
            ) : null}
            <Button
              variant="ghost"
              disabled={!canEditActiveReviewer}
              onClick={saveDraft}
            >
              Save Draft
            </Button>
            <Button disabled={!canEditActiveReviewer} onClick={submit}>
              Submit
            </Button>
          </div>
        </div>
      </div>

      {commentTarget ? (
        <CommentModal
          question={commentTarget.question}
          reviewer={commentTarget.reviewer}
          comment={commentForReviewer(
            ratings[commentTarget.question.id],
            commentTarget.reviewer,
          )}
          editable={
            commentTarget.reviewer === "supervisor"
              ? canEditSupervisor
              : canEditSelf
          }
          onChange={(c) =>
            setQuestionComment(
              commentTarget.question.id,
              commentTarget.reviewer,
              c,
            )
          }
          onClose={() => setCommentTarget(null)}
          onSave={async () => {
            if (
              commentTarget.reviewer === activeReviewer &&
              canEditActiveReviewer
            )
              await saveDraft();
            setCommentTarget(null);
          }}
        />
      ) : null}
    </PerformanceLayout>
  );
}
