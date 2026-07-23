import { TemplateQuestion } from "../../types/performance.types";

export type ReviewerType = "self" | "supervisor";

const MINIMUM_KPI_RATING = 1;
const MAXIMUM_KPI_RATING = 5;

export function isAssignedKpiRating(score: number | null | undefined) {
  const numericScore = Number(score);
  return (
    Number.isFinite(numericScore) &&
    numericScore >= MINIMUM_KPI_RATING &&
    numericScore <= MAXIMUM_KPI_RATING
  );
}

export function calculateWeightedKpiRating(
  questions: TemplateQuestion[],
  getScore: (question: TemplateQuestion) => number,
) {
  const assignedRatings = questions
    .map((question) => ({
      score: Number(getScore(question)),
      weight: Number(question.weight),
    }))
    .filter(({ score }) => isAssignedKpiRating(score));

  if (assignedRatings.length === 0) return 0;

  const weightedRatings = assignedRatings.filter(
    ({ weight }) => Number.isFinite(weight) && weight > 0,
  );
  const ratingsForCalculation =
    weightedRatings.length > 0 ? weightedRatings : assignedRatings;
  const totalWeight = ratingsForCalculation.reduce(
    (weightTotal, { weight }) =>
      weightTotal + (weightedRatings.length > 0 ? weight : 1),
    0,
  );
  const weightedScore = ratingsForCalculation.reduce(
    (scoreTotal, { score, weight }) =>
      scoreTotal + score * (weightedRatings.length > 0 ? weight : 1),
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
