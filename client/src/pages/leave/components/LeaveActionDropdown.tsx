import { useEffect, useRef, useState } from "react";
import { Ban, Check, ChevronDown, X } from "lucide-react";

interface MenuPosition {
  top: number;
  left: number;
}

interface LeaveActionDropdownProps {
  canApproveReject: boolean;
  canCancel: boolean;
  loading?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

enum BrowserEvent {
  MOUSE_DOWN = "mousedown",
  SCROLL = "scroll",
  RESIZE = "resize",
}

export default function LeaveActionDropdown({
  canApproveReject,
  canCancel,
  loading = false,
  onApprove,
  onReject,
  onCancel,
}: LeaveActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
  });

  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const openMenu = () => {
    if (actionButtonRef.current) {
      const buttonRectangle = actionButtonRef.current.getBoundingClientRect();

      setMenuPosition({
        top: buttonRectangle.bottom + 4,
        left: buttonRectangle.right,
      });
    }

    setIsOpen(true);
  };

  const handleToggleMenu = () => {
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const handleApproveAction = () => {
    closeMenu();
    onApprove();
  };

  const handleRejectAction = () => {
    closeMenu();
    onReject();
  };

  const handleCancelAction = () => {
    closeMenu();
    onCancel();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const clickedElement = event.target as Node;

      const clickedOutsideButton =
        !actionButtonRef.current?.contains(clickedElement);

      const clickedOutsideMenu =
        !actionMenuRef.current?.contains(clickedElement);

      if (clickedOutsideButton && clickedOutsideMenu) {
        closeMenu();
      }
    };

    const handleViewportChange = () => {
      closeMenu();
    };

    document.addEventListener(BrowserEvent.MOUSE_DOWN, handleClickOutside);
    window.addEventListener(BrowserEvent.SCROLL, handleViewportChange, true);
    window.addEventListener(BrowserEvent.RESIZE, handleViewportChange);

    return () => {
      document.removeEventListener(BrowserEvent.MOUSE_DOWN, handleClickOutside);
      window.removeEventListener(
        BrowserEvent.SCROLL,
        handleViewportChange,
        true,
      );
      window.removeEventListener(BrowserEvent.RESIZE, handleViewportChange);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-2" />
    );
  }

  if (!canApproveReject && !canCancel) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <>
      <button
        ref={actionButtonRef}
        type="button"
        onClick={handleToggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition whitespace-nowrap"
      >
        Select Action
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          ref={actionMenuRef}
          role="menu"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
          className="fixed -translate-x-full z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-36"
        >
          {canApproveReject && (
            <button
              type="button"
              role="menuitem"
              onClick={handleApproveAction}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 transition cursor-pointer"
            >
              <Check size={14} aria-hidden="true" />
              Approve
            </button>
          )}

          {canApproveReject && (
            <button
              type="button"
              role="menuitem"
              onClick={handleRejectAction}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
              Reject
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              role="menuitem"
              onClick={handleCancelAction}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Ban size={14} aria-hidden="true" />
              Cancel
            </button>
          )}
        </div>
      )}
    </>
  );
}
