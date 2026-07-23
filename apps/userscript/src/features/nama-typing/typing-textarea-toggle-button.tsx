import { Button } from "@repo/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
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

let isTypingTextareaHidden = getInitialHidden();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setTypingTextareaHidden = (next: boolean) => {
  isTypingTextareaHidden = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // ignore storage errors
  }
  for (const listener of listeners) listener();
};

export const useTypingTextareaHidden = () =>
  useSyncExternalStore(subscribe, () => isTypingTextareaHidden);

export const TypingTextareaToggleButton = () => {
  const mountEl = usePortalMount("#right_menu", { position: "afterbegin" });
  const isHidden = useTypingTextareaHidden();

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
      onClick={() => setTypingTextareaHidden(!isTypingTextareaHidden)}
      aria-label={label}
      title={label}
    >
      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
    </Button>,
    mountEl,
  );
};
