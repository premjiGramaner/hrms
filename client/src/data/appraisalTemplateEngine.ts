import {
  AppraisalTemplate,
  TemplateQuestion,
  TemplateQuestionCategory,
  TemplateSection,
} from "../types/performance.types";

export const templateQuestionCategories: TemplateQuestionCategory[] = [
  "Behavioural Competency",
  "Functional Competency",
  "Leadership Competency",
  "SMART Goals",
  "General",
];

export function getTemplateById(
  templates: AppraisalTemplate[],
  templateId?: string,
) {
  return (
    templates.find((template) => template.id === templateId) ?? templates[0]
  );
}

export function sortTemplateQuestions(
  section: TemplateSection,
): TemplateQuestion[] {
  return [...section.questions].sort((a, b) => a.order - b.order);
}

export function normalizeQuestionOrder(questions: TemplateQuestion[]) {
  return questions.map((question, index) => ({
    ...question,
    order: index + 1,
  }));
}

export function buildDisplayText(
  question: Pick<TemplateQuestion, "category" | "title" | "description">,
) {
  return `${question.category}_${question.title}_${question.description}`;
}

export function createQuestion(
  input: Omit<TemplateQuestion, "id" | "displayText" | "order">,
  order: number,
): TemplateQuestion {
  const idBase = `${input.category}-${input.title}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    ...input,
    id: idBase,
    displayText: buildDisplayText(input),
    order,
  };
}

export function replaceTemplate(
  templates: AppraisalTemplate[],
  template: AppraisalTemplate,
) {
  return templates.map((item) => (item.id === template.id ? template : item));
}

export function updateTemplateQuestion(
  template: AppraisalTemplate,
  sectionId: string,
  question: TemplateQuestion,
) {
  return {
    ...template,
    sections: template.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            questions: normalizeQuestionOrder(
              section.questions.map((item) =>
                item.id === question.id
                  ? { ...question, displayText: buildDisplayText(question) }
                  : item,
              ),
            ),
          }
        : section,
    ),
  };
}

export function addTemplateQuestion(
  template: AppraisalTemplate,
  sectionId: string,
  input: Omit<TemplateQuestion, "id" | "displayText" | "order">,
) {
  return {
    ...template,
    sections: template.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            questions: normalizeQuestionOrder([
              ...section.questions,
              createQuestion(input, section.questions.length + 1),
            ]),
          }
        : section,
    ),
  };
}

export function deleteTemplateQuestion(
  template: AppraisalTemplate,
  sectionId: string,
  questionId: string,
) {
  return {
    ...template,
    sections: template.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            questions: normalizeQuestionOrder(
              section.questions.filter(
                (question) => question.id !== questionId,
              ),
            ),
          }
        : section,
    ),
  };
}

export function moveTemplateQuestion(
  template: AppraisalTemplate,
  sectionId: string,
  questionId: string,
  direction: "up" | "down",
) {
  return {
    ...template,
    sections: template.sections.map((section) => {
      if (section.id !== sectionId) return section;
      const questions = sortTemplateQuestions(section);
      const index = questions.findIndex(
        (question) => question.id === questionId,
      );
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= questions.length)
        return section;
      const reordered = [...questions];
      [reordered[index], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[index],
      ];
      return { ...section, questions: normalizeQuestionOrder(reordered) };
    }),
  };
}

export function cloneTemplate(template: AppraisalTemplate): AppraisalTemplate {
  const suffix = Date.now().toString(36);
  return {
    ...template,
    id: `${template.id}-clone-${suffix}`,
    templateName: `${template.templateName} - Copy`,
    sections: template.sections.map((section) => ({
      ...section,
      id: `${section.id}-clone-${suffix}`,
      questions: section.questions.map((question) => ({
        ...question,
        id: `${question.id}-clone-${suffix}`,
      })),
    })),
  };
}

export function validateTemplate(template: AppraisalTemplate): string[] {
  const errors: string[] = [];
  if (!template.jobTitle.trim()) errors.push("Job title is required.");
  if (!template.templateName.trim()) errors.push("Template name is required.");
  if (!template.sections.some((section) => section.questions.length > 0))
    errors.push("Template must have at least one KPI.");
  template.sections.forEach((section) => {
    const orders = new Set<number>();
    section.questions.forEach((question) => {
      if (!question.category) errors.push("KPI category is required.");
      if (!question.title.trim()) errors.push("KPI title is required.");
      if (orders.has(question.order))
        errors.push("KPI order should be unique inside a template.");
      orders.add(question.order);
    });
  });
  return [...new Set(errors)];
}
