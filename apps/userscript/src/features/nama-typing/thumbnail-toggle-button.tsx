import { Button } from "@repo/ui/button";
import { Image as ImageIcon, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalMount } from "@/utils/use-portal-mount";
import { useWindowProperty } from "@/utils/use-window-property";

const PLAYER_ID = "yt_player";
const STORAGE_KEY = "nama-typing:thumbnail-mode";

const getInitialEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const getThumbnailUrl = (
  videoId: string,
  quality: "mqdefault" | "maxresdefault",
) => `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;

const clickStartButton = () => {
  const startImg = document.querySelector('#center_menu img[alt="開始"]');
  startImg?.closest("button")?.click();
};

const applyThumbnail = (url: string | null) => {
  const player = document.getElementById(PLAYER_ID);
  const wrapper = player?.parentElement;
  if (!player || !wrapper) return;

  wrapper.removeEventListener("click", clickStartButton);

  if (url) {
    wrapper.style.backgroundImage = `url(${url})`;
    wrapper.style.backgroundSize = "cover";
    wrapper.style.backgroundPosition = "center";
    wrapper.style.cursor = "pointer";
    player.style.visibility = "hidden";
    wrapper.addEventListener("click", clickStartButton);
  } else {
    wrapper.style.backgroundImage = "";
    wrapper.style.cursor = "";
    player.style.visibility = "";
  }
};

export const ThumbnailToggleButton = () => {
  const mountEl = usePortalMount("#right_menu", { position: "afterbegin" });
  const ime = useWindowProperty("__ytyping_ime");
  const [isEnabled, setIsEnabled] = useState(getInitialEnabled);

  useEffect(() => {
    if (!mountEl || !ime) return;

    if (!isEnabled) {
      applyThumbnail(null);
      return;
    }

    let cancelled = false;
    ime.ensureMapInfo().then((mapInfo) => {
      if (cancelled || !mapInfo) return;
      applyThumbnail(
        getThumbnailUrl(mapInfo.media.videoId, mapInfo.media.thumbnailQuality),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [mountEl, ime, isEnabled]);

  if (!mountEl) return null;

  const label = isEnabled ? "動画を表示" : "サムネイル画像を表示";

  return createPortal(
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setIsEnabled((prev) => {
          const next = !prev;
          try {
            localStorage.setItem(STORAGE_KEY, String(next));
          } catch {
            // ignore storage errors
          }
          return next;
        });
      }}
      aria-label={label}
      title={label}
    >
      {isEnabled ? <ImageOff size={16} /> : <ImageIcon size={16} />}
    </Button>,
    mountEl,
  );
};
