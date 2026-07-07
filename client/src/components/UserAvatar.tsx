import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { updateUserAvatar, updateUserName } from "../store/authSlice";
import { getMyInfo } from "../api/employee.api";

interface UserAvatarProps {
  size?: number;
  className?: string;
  showInitials?: boolean;
}

/**
 * Reusable UserAvatar component that:
 * 1. Displays the logged-in user's avatar from Redux state
 * 2. On mount, fetches latest user data to detect admin-updated avatars
 * 3. Updates Redux if avatar or name has changed
 * 4. Uses key={avatar} to force re-render when avatar changes
 * 5. Handles Base64 avatars correctly (no /uploads/ prefix)
 */
export default function UserAvatar({
  size = 72,
  className = "",
  showInitials = true,
}: UserAvatarProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLatestUserData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch latest logged-in user data
        const { data: latestUser } = await getMyInfo();

        // Check if avatar has changed
        if (latestUser.avatar && latestUser.avatar !== user.avatar) {
          console.log("🔄 UserAvatar - Avatar changed, updating Redux");
          console.log("   Old avatar:", user.avatar?.substring(0, 50));
          console.log("   New avatar:", latestUser.avatar?.substring(0, 50));
          dispatch(updateUserAvatar(latestUser.avatar));
        }

        // Check if name has changed
        const currentFullName =
          user.name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim();
        const latestFullName =
          latestUser.name ||
          `${latestUser.first_name || ""} ${latestUser.last_name || ""}`.trim();

        if (latestFullName && latestFullName !== currentFullName) {
          console.log("🔄 UserAvatar - Name changed, updating Redux");
          console.log("   Old name:", currentFullName);
          console.log("   New name:", latestFullName);
          dispatch(
            updateUserName({
              first_name: latestUser.first_name,
              last_name: latestUser.last_name,
              name: latestUser.name,
            }),
          );
        }
      } catch (error) {
        console.error("❌ UserAvatar - Failed to fetch latest user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestUserData();
  }, [user?.id]); // Only re-run if user ID changes (login/logout)

  if (!user) {
    return null;
  }

  const username = user.name || user.username || "User";
  const avatar = user.avatar;

  // Show loading skeleton while fetching
  if (isLoading) {
    return (
      <div
        className={`rounded-full bg-gray-200 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: avatar
          ? "transparent"
          : "linear-gradient(135deg, #fcd34d, #f97316)",
      }}
    >
      {avatar ? (
        <img
          key={avatar} // Force re-render when avatar changes
          src={avatar} // Direct Base64 string, no /uploads/ prefix
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          alt={username}
        />
      ) : (
        showInitials && (
          <span style={{ color: "#fff", fontSize: size / 2.77, fontWeight: 700 }}>
            {username.charAt(0).toUpperCase()}
          </span>
        )
      )}
    </div>
  );
}
