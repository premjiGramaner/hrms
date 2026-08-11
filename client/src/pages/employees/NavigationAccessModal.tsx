import { useEffect, useState } from "react";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { Employee } from "../../types";
import { getEmployee, saveNavigationPermissions } from "../../api/employee.api";
import { getRoleLabel } from "../../config/roles";
import Toast from "../../utils/toast";

const MENUS = [
  ["my_info", "My Info"],
  ["leave", "Leave"],
  ["performance", "Performance"],
  ["reports_analytics", "Reports and Analytics"],
  ["employee_management", "Employee Management"],
];

export default function NavigationAccessModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEmployee(employee.id)
      .then(({ data }) => setSelected(data.navigation_permissions || []))
      .catch(() => Toast.error("Unable to load navigation access"))
      .finally(() => setLoading(false));
  }, [employee.id]);

  const toggle = (key: string) =>
    setSelected((items) =>
      items.includes(key) ? items.filter((item) => item !== key) : [...items, key],
    );

  const save = async () => {
    try {
      await saveNavigationPermissions(employee.id, selected);
      Toast.success("Navigation access saved successfully");
      onClose();
    } catch {
      Toast.error("Unable to save navigation access");
    }
  };

  return (
    <Modal
      title="Navigation Access"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={loading} onClick={save}>Save Permissions</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        <b>{employee.name}</b> · {employee.employee_id} · {getRoleLabel(employee.role)}
      </p>
      {loading ? (
        <p>Loading permissions...</p>
      ) : (
        <div className="space-y-2">
          {MENUS.map(([key, label]) => (
            <label key={key} className="flex gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={() => toggle(key)}
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
