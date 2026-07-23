import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { subscribeNicoLiveChat } from "@toshi7878/nicolive-api-ts";
import { MessageSquareShare } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeTwitchLiveChat } from "@/lib/twitch-live-chat-client";
import { subscribeYTLiveChat } from "@/lib/youtube-live-chat-client";
import { extractNiconicoLiveId } from "@/utils/extract-niconico-id";
import { extractTwitchLiveId } from "@/utils/extract-twitch-id";
import { extractYouTubeLiveId } from "@/utils/extract-youtube-id";
import { usePortalMount } from "@/utils/use-portal-mount";
import { useWindowProperty } from "@/utils/use-window-property";
import type { ChatMessage } from "./container";
import { useTypingTextareaHidden } from "./typing-textarea-toggle-button";

const STORAGE_KEY_PLATFORM = "nama-typing:live-chat-platform";
const STORAGE_KEY_YT = "nama-typing:yt-live-chat-url";
const STORAGE_KEY_TWITCH = "nama-typing:twitch-channel-name";
const STORAGE_KEY_NICONICO = "nama-typing:niconico-live-id";
const CHAT_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/%E3%83%8B%E3%82%B3%E3%82%BF%E3%82%A4%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%80%90youtubetwitch%E3%80%91/bhgkolgcippppaoafnmahbgokcojdopf";
type Platform = ChatMessage["platform"];

export type LiveChatDisconnectInfo = {
  liveId: string;
  platform: Platform;
};

interface ImeLiveChatConnectorProps {
  onConnect: () => void;
  onDisconnect: (info: LiveChatDisconnectInfo) => void;
  onChat: (messages: ChatMessage[]) => void;
  onError: (error: Error) => void;
}

export const ImeLiveChatConnector = ({
  onConnect,
  onDisconnect,
  onChat,
  onError,
}: ImeLiveChatConnectorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<Platform>(
    () => (localStorage.getItem(STORAGE_KEY_PLATFORM) as Platform) ?? "youtube",
  );
  const [liveChatValue, setLiveChatValue] = useState(() =>
    getStorageValue(platform),
  );
  const mountEl = usePortalMount("body", { position: "beforeend" });
  const isTypingTextareaHidden = useTypingTextareaHidden();
  const { isStarted } = useLiveChatSession(
    inputRef,
    platform,
    onConnect,
    onDisconnect,
    onChat,
    onError,
  );
  const resultHistoryLiveId = extractLiveId(platform, liveChatValue);
  const resultHistoryHref = resultHistoryLiveId
    ? `https://namaytyping.vercel.app/live/${encodeURIComponent(resultHistoryLiveId)}`
    : undefined;

  if (isStarted || !mountEl) return null;

  return createPortal(
    <div
      className={`fixed right-4 z-[9999] flex flex-col gap-1 ${isTypingTextareaHidden ? "bottom-12" : "bottom-4"}`}
    >
      <Input
        key={platform}
        ref={inputRef}
        value={liveChatValue}
        onChange={(e) => {
          setLiveChatValue(e.target.value);
          setStorageValue(platform, e.target.value);
        }}
        onPaste={(e) => {
          const value = e.clipboardData.getData("text");
          const liveId = extractLiveId(platform, value);
          e.preventDefault();
          if (!liveId) return;
          setLiveChatValue(liveId);
          setStorageValue(platform, liveId);
        }}
        placeholder={getPlaceholder(platform)}
        className="w-48"
        size="sm"
      />
      <div className="flex items-center gap-2">
        <Select
          value={platform}
          onValueChange={(v) => {
            const p = v as Platform;
            const nextValue = getStorageValue(p);
            setPlatform(p);
            setLiveChatValue(nextValue);
            localStorage.setItem(STORAGE_KEY_PLATFORM, p);
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitch">Twitch</SelectItem>
            <SelectItem value="niconico">Niconico</SelectItem>
          </SelectContent>
        </Select>
        {resultHistoryHref ? (
          <Button variant="outline" className="text-sm" size="xs" asChild>
            <a
              aria-label="リザルト履歴 外部URL"
              href={resultHistoryHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              リザルト履歴
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="xs" disabled>
            リザルト履歴
          </Button>
        )}
        <Button variant="outline" size="icon" className="size-8" asChild>
          <a
            aria-label="ニコタイチャット拡張機能ページ"
            href={CHAT_EXTENSION_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageSquareShare size={16} />
          </a>
        </Button>
      </div>
    </div>,
    mountEl,
  );
};

const getStorageValue = (platform: Platform) => {
  switch (platform) {
    case "youtube":
      return sessionStorage.getItem(STORAGE_KEY_YT) ?? "";
    case "twitch":
      return localStorage.getItem(STORAGE_KEY_TWITCH) ?? "";
    case "niconico":
      return sessionStorage.getItem(STORAGE_KEY_NICONICO) ?? "";
  }
};

const setStorageValue = (platform: Platform, value: string) => {
  switch (platform) {
    case "youtube":
      return sessionStorage.setItem(STORAGE_KEY_YT, value);
    case "twitch":
      return localStorage.setItem(STORAGE_KEY_TWITCH, value);
    case "niconico":
      return sessionStorage.setItem(STORAGE_KEY_NICONICO, value);
  }
};

const getPlaceholder = (platform: Platform) => {
  switch (platform) {
    case "youtube":
      return "YouTube Live URL or ID";
    case "twitch":
      return "Twitch channel name";
    case "niconico":
      return "Niconico Live URL or ID";
  }
};

const extractLiveId = (platform: Platform, value: string) => {
  switch (platform) {
    case "youtube":
      return extractYouTubeLiveId(value);
    case "twitch":
      return extractTwitchLiveId(value);
    case "niconico":
      return extractNiconicoLiveId(value);
  }
};

const useLiveChatSession = (
  inputRef: RefObject<HTMLInputElement | null>,
  platform: Platform,
  onConnect: () => void,
  onDisconnect: (info: LiveChatDisconnectInfo) => void,
  onChat: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
) => {
  const [isStarted, setIsStarted] = useState(false);
  const activeSessionRef = useRef<LiveChatDisconnectInfo | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const ime = useWindowProperty("__ytyping_ime");
  const platformRef = useRef(platform);
  platformRef.current = platform;

  useEffect(() => {
    if (!ime) return;

    function startClient(_event: Event) {
      const rawValue = inputRef.current?.value ?? "";
      setIsStarted(true);

      unsubscribeRef.current?.();

      switch (platformRef.current) {
        case "youtube": {
          const liveId = extractYouTubeLiveId(rawValue);
          if (!liveId) return;
          activeSessionRef.current = { liveId, platform: "youtube" };
          unsubscribeRef.current = subscribeYTLiveChat({
            liveId,
            onChat: (messages) => onChat(withPlatform(messages, "youtube")),
            onConnect,
            onError,
          });
          break;
        }
        case "twitch": {
          const channelName = extractTwitchLiveId(rawValue);
          if (!channelName) return;
          activeSessionRef.current = {
            liveId: channelName,
            platform: "twitch",
          };
          unsubscribeRef.current = subscribeTwitchLiveChat({
            channelName,
            onChat: (messages) => onChat(withPlatform(messages, "twitch")),
            onConnect,
            onError,
          });
          break;
        }
        case "niconico": {
          const liveId = extractNiconicoLiveId(rawValue);
          if (!liveId) return;
          activeSessionRef.current = { liveId, platform: "niconico" };
          unsubscribeRef.current = subscribeNicoLiveChat({
            liveId,
            onChat: (messages) => onChat(withPlatform(messages, "niconico")),
            onConnect,
            onError,
          });
          break;
        }
      }
    }

    function handleEnd() {
      const activeSession = activeSessionRef.current;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      activeSessionRef.current = null;
      setIsStarted(false);
      if (activeSession) onDisconnect(activeSession);
    }

    ime.removeEventListener("start", startClient);
    ime.addEventListener("start", startClient);
    ime.removeEventListener("end", handleEnd);
    ime.addEventListener("end", handleEnd);

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      activeSessionRef.current = null;
      ime.removeEventListener("start", startClient);
      ime.removeEventListener("end", handleEnd);
    };
  }, [ime, inputRef, onChat, onConnect, onDisconnect, onError]);

  return { isStarted };
};

const withPlatform = (
  messages: Omit<ChatMessage, "platform">[],
  platform: Platform,
): ChatMessage[] =>
  messages.map((message) => ({
    ...message,
    name: message.author || "名無し",
    platform,
  }));
