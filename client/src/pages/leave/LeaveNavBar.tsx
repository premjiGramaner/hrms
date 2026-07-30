import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { PAGE_PATHS, isAdminRole } from "../../config/roles";
import "./Style/LeaveNavBar.css";

export default function LeaveNavBar() {
  const { pathname } = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = isAdminRole(user?.role);

  const [isEntitlementMenuOpen, setIsEntitlementMenuOpen] = useState(false);
  const entitlementMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        entitlementMenuRef.current &&
        !entitlementMenuRef.current.contains(event.target as Node)
      ) {
        setIsEntitlementMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const isActivePath = (path: string): boolean =>
    pathname === path || pathname.startsWith(`${path}/`);

  const getTabClassName = (isActive: boolean): string =>
    `leave-nav__tab ${
      isActive ? "leave-nav__tab--active" : "leave-nav__tab--inactive"
    }`;

  const entitlementSubPaths = [
    PAGE_PATHS.leaveEntitlementsAdd,
    PAGE_PATHS.leaveEntitlementsList,
    PAGE_PATHS.leaveEntitlementsMy,
  ];

  const isEntitlementActive = entitlementSubPaths.some(
    (path) => pathname === path,
  );

  const entitlementMenuItems = [
    {
      label: "Add Entitlements",
      path: PAGE_PATHS.leaveEntitlementsAdd,
    },
    {
      label: "Entitlement List",
      path: PAGE_PATHS.leaveEntitlementsList,
    },
    {
      label: "My Entitlements",
      path: PAGE_PATHS.leaveEntitlementsMy,
    },
  ];

  const handleToggleEntitlementMenu = () => {
    setIsEntitlementMenuOpen((previousState) => !previousState);
  };

  const handleCloseEntitlementMenu = () => {
    setIsEntitlementMenuOpen(false);
  };

  return (
    <nav className="leave-nav">
      <Link
        to={PAGE_PATHS.leaveApply}
        className={getTabClassName(isActivePath(PAGE_PATHS.leaveApply))}
      >
        Apply
      </Link>

      <Link
        to={PAGE_PATHS.leaveList}
        className={getTabClassName(isActivePath(PAGE_PATHS.leaveList))}
      >
        Leave List
      </Link>

      {!isAdmin && (
        <Link
          to={PAGE_PATHS.leaveEntitlementsMy}
          className={getTabClassName(
            isActivePath(PAGE_PATHS.leaveEntitlementsMy),
          )}
        >
          My Entitlements
        </Link>
      )}

      {isAdmin && (
        <div ref={entitlementMenuRef} className="leave-nav__dropdown">
          <button
            type="button"
            onClick={handleToggleEntitlementMenu}
            className={`leave-nav__dropdown-button ${
              isEntitlementActive
                ? "leave-nav__dropdown-button--active"
                : "leave-nav__dropdown-button--inactive"
            }`}
            aria-expanded={isEntitlementMenuOpen}
            aria-haspopup="menu"
          >
            Entitlements
            <svg
              className={`leave-nav__dropdown-icon ${
                isEntitlementMenuOpen ? "leave-nav__dropdown-icon--open" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isEntitlementMenuOpen && (
            <div className="leave-nav__dropdown-menu" role="menu">
              {entitlementMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleCloseEntitlementMenu}
                  className={`leave-nav__dropdown-link ${
                    pathname === item.path
                      ? "leave-nav__dropdown-link--active"
                      : "leave-nav__dropdown-link--inactive"
                  }`}
                  role="menuitem"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
