import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { sortTemplateQuestions } from "../../data/appraisalTemplateEngine";
import { AppraisalTemplate } from "../../types/performance.types";

type Props = {
  template: AppraisalTemplate;
  onClose: () => void;
};

export default function TemplatePreviewModal({ template, onClose }: Props) {
  return (
    <Modal
      title="Preview Appraisal Template"
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-400">Template</p>
          <h2 className="text-xl font-bold text-slate-700">
            {template.templateName}
          </h2>
        </div>
        {template.sections.map((section) => (
          <div key={section.id}>
            <h3 className="mb-3 text-sm font-bold text-navy-700">
              {section.name} (Weight {section.weight})
            </h3>
            <div className="info-section">
              {sortTemplateQuestions(section).map((question) => (
                <div
                  key={question.id}
                  className="rounded bg-[#eeecef] px-4 py-3 text-sm font-semibold text-slate-500"
                >
                  {question.order}. {question.displayText}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
