import { Link } from "react-router-dom";
import { PAGE_PATHS } from "../../../config/roles";
import { IconShield } from "../../../components/Icons";

const QUICK_ACCESS_ITEMS = [
  {
    label: "My Appraisals",
    path: PAGE_PATHS.performanceMyAppraisals,
    icon: <IconShield size={32} />,
    color: "bg-[#ffa726]",
  },
];

export default function QuickAccess() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#333333]">Quick Access</h2>
      </div>
      <div className="space-y-3">
        {QUICK_ACCESS_ITEMS.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={`w-full ${item.color} text-white p-4 rounded-lg flex items-center gap-4 hover:shadow-md transition`}
          >
            <div className="flex-shrink-0">{item.icon}</div>
            <div className="text-left font-medium text-sm">{item.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
