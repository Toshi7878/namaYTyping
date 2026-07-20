import { Button } from "@repo/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalMount } from "@/utils/use-portal-mount";

const HIDDEN_TARGET_IDS = ["typing_textarea", "bottom_spacer"];
const STORAGE_KEY = "nama-typing:typing-textarea-hidden";

const getInitialHidden = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const TypingTextareaToggleButton = () => {
  const mountEl = usePortalMount("#right_menu", { position: "afterbegin" });
  const [isHidden, setIsHidden] = useState(getInitialHidden);

  useEffect(() => {
    if (!mountEl) return;
    for (const id of HIDDEN_TARGET_IDS) {
      const el = document.getElementById(id);
      if (el) el.style.display = isHidden ? "none" : "";
    }
  }, [mountEl, isHidden]);

  if (!mountEl) return null;

  const label = isHidden ? "入力欄を表示" : "入力欄を非表示";

  return createPortal(
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setIsHidden((prev) => {
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
      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
    </Button>,
    mountEl,
  );
};
