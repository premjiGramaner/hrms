import { TemplateQuestion } from "../../types/performance.types";

export type ReviewerType = "self" | "supervisor";

const MINIMUM_KPI_RATING = 0.5;
const MAXIMUM_KPI_RATING = 5;
const KPI_RATING_INCREMENT = 0.5;

export function isAssignedKpiRating(score: number | null | undefined) {
  const numericScore = Number(score);
  return (
    Number.isFinite(numericScore) &&
    numericScore >= MINIMUM_KPI_RATING &&
    numericScore <= MAXIMUM_KPI_RATING &&
    Number.isInteger(numericScore / KPI_RATING_INCREMENT)
  );
}

export function calculateWeightedKpiRating(
  questions: TemplateQuestion[],
  getScore: (question: TemplateQuestion) => number,
) {
  const ratings = questions.map((question) => {
    const score = Number(getScore(question));
    return {
      score: isAssignedKpiRating(score) ? score : 0,
      weight: Number(question.weight),
    };
  });

  if (ratings.length === 0) return 0;

  const useWeights = ratings.every(
    ({ weight }) => Number.isFinite(weight) && weight > 0,
  );
  const totalWeight = ratings.reduce(
    (weightTotal, { weight }) => weightTotal + (useWeights ? weight : 1),
    0,
  );
  const weightedScore = ratings.reduce(
    (scoreTotal, { score, weight }) =>
      scoreTotal + score * (useWeights ? weight : 1),
    0,
  );

  return Number((weightedScore / totalWeight).toFixed(2));
}

export function getRatingSubmissionError(
  questions: TemplateQuestion[],
  reviewerType: ReviewerType,
  getScore: (question: TemplateQuestion) => number,
) {
  const missingQuestions = questions.filter(
    (question) => !isAssignedKpiRating(getScore(question)),
  );

  if (missingQuestions.length > 0) {
    const reviewerLabel =
      reviewerType === "supervisor" ? "Supervisors" : "Employees";
    return `${reviewerLabel} must rate every active KPI before submitting. Missing ratings: ${missingQuestions
      .map((question) => question.title)
      .join(", ")}.`;
  }

  return "";
}
