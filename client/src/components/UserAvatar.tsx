import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { updateUserAvatar, updateUserName } from "../store/authSlice";
import { getMyInfo } from "../api/employee.api";
import { getAvatarSrc } from "../utils/avatar";

interface UserAvatarProps {
  size?: number;
  className?: string;
  showInitials?: boolean;
}

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
        const { data: latestUser } = await getMyInfo();

        if (latestUser.avatar && latestUser.avatar !== user.avatar) {
          dispatch(updateUserAvatar(latestUser.avatar));
        }

        const currentFullName =
          user.name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim();
        const latestFullName =
          latestUser.name ||
          `${latestUser.first_name || ""} ${latestUser.last_name || ""}`.trim();

        if (latestFullName && latestFullName !== currentFullName) {
          dispatch(
            updateUserName({
              first_name: latestUser.first_name,
              last_name: latestUser.last_name,
              name: latestUser.name,
            }),
          );
        }
      } catch (error) {
        console.error(
          "❌ UserAvatar - Failed to fetch latest user data:",
          error,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestUserData();
  }, [user?.id]); 

  if (!user) {
    return null;
  }

  const username = user.name || user.username || "User";
  const avatar = user.avatar;
  const avatarSrc = getAvatarSrc(avatar);

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
        background: avatarSrc
          ? "transparent"
          : "linear-gradient(135deg, #fcd34d, #f97316)",
      }}
    >
      {avatarSrc ? (
        <img
          key={avatarSrc}
          src={avatarSrc}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          alt={username}
        />
      ) : (
        showInitials && (
          <span
            style={{ color: "#fff", fontSize: size / 2.77, fontWeight: 700 }}
          >
            {username.charAt(0).toUpperCase()}
          </span>
        )
      )}
    </div>
  );
}
