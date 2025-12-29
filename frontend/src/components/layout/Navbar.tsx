import React from "react";
import { useAuth } from "../../features/auth/useAuth";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";

/**
 * Navbar Component
 *
 * Mobile Layout:
 *   - Left: App name ("EduPlatform") beside menu icon
 *   - Right: NotificationBell
 *
 * Desktop Layout (md+):
 *   - Left: Empty (sidebar has the logo)
 *   - Right: NotificationBell + Logout button
 */
const Navbar: React.FC = () => {
  const { user, logoutUser } = useAuth();

  return (
    <header
      className="
        fixed top-0 right-0 left-0 md:left-64
        h-16 bg-card border-b border-border
        flex items-center justify-between
        px-4 md:px-6
        z-40
        transition-all duration-300 ease-in-out
      "
      role="banner"
    >
      {/* Left side: App name on mobile (positioned to not overlap with menu), empty on desktop */}
      <div className="flex items-center">
        {/* Mobile: Show app name with proper spacing for menu icon */}
        <span
          className="
            text-lg font-bold text-foreground md:hidden
            ml-14
          "
        >
          EduPlatform
        </span>

        {/* Desktop: Empty space (logo is in sidebar) */}
        <div className="hidden md:block" />
      </div>

      {/* Right side: Notification Bell + Logout (desktop only) */}
      <div className="flex items-center gap-3">
        {/* Notification Bell (visible on all screen sizes when logged in) */}
        {user && <NotificationBell />}

        {/* Desktop: Logout Button */}
        {user && (
          <button
            type="button"
            onClick={logoutUser}
            className="
              hidden md:inline-flex
              px-4 py-2
              bg-destructive text-destructive-foreground
              hover:bg-destructive/90
              rounded-md
              text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2
              focus:ring-offset-background
            "
            aria-label="Logout"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;