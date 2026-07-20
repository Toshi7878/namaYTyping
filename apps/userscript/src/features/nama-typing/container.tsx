import { unsafeWindow } from "$";
import type { YTypingIme } from "../ytyping";
import {
  ImeLiveChatConnector,
  type LiveChatDisconnectInfo,
} from "./ime-live-chat-connerctor";
import { getNicoName } from "./niconico";
import { createResultWithUser } from "./save-live-result";
import { TypingTextareaToggleButton } from "./typing-textarea-toggle-button";

type Platform = "youtube" | "twitch" | "niconico";
export interface ChatMessage {
  platform: Platform;
  userId: string;
  author: string;
  message: string;
  timestampUsec: string;
  isMember: boolean;
}

export const NamaTypingContainer = () => {
  return (
    <>
      <TypingTextareaToggleButton />
      <ImeLiveChatConnector
        onChat={(messages) => handleChat(messages)}
        onConnect={() =>
          unsafeWindow.__ytyping?.toast.success("ライブチャットに接続しました")
        }
        onDisconnect={(info) =>
          void (async () => {
            await saveLiveResult(info);
            unsafeWindow.__ytyping?.toast.success("リザルトを保存しました");
          })().catch((e) => {
            const error = e instanceof Error ? e : new Error(String(e));
            unsafeWindow.__ytyping?.toast.error(
              `リザルト保存エラー: ${error.message}`,
            );
          })
        }
        onError={(e) =>
          unsafeWindow.__ytyping?.toast.error(`接続エラー: ${e.message}`)
        }
      />
    </>
  );
};

async function saveLiveResult({ liveId }: LiveChatDisconnectInfo) {
  const ime = unsafeWindow.__ytyping_ime;
  if (!ime) return;

  const mapInfo = await ime.ensureMapInfo();
  const builtMap = ime.getBuiltMap();

  if (!builtMap || !mapInfo) {
    throw new Error("保存する譜面情報を取得できませんでした");
  }

  await createResultWithUser({
    liveId,
    map: {
      mapId: mapInfo.id,
      rating: mapInfo.difficulty.rating,
      totalNotes: builtMap.totalNotes,
      flatWords: builtMap.flatWords,
      media: mapInfo.media,
      info: {
        title: mapInfo.info.title,
        artistName: mapInfo.info.artistName,
        source: mapInfo.info.source,
      },
    },
    userResults: ime.getUserResults(),
  });
}

function handleChat(messages: ChatMessage[]) {
  const ime = unsafeWindow.__ytyping_ime;
  if (!ime) return;

  for (const m of messages) {
    console.log(m);
    switch (m.platform) {
      case "niconico": {
        const name = getNicoName(m);
        const { isWordComment } = handleTyping(ime, { ...m, author: name });

        if (!isWordComment && m.message.match(/^@(.+)/)) {
          const newName = m.message.slice(1).trim().slice(0, 20);
          ime.updateUserName(m.userId, newName);
          ime.addNotifications([`名前変更: ${name} -> ${newName}`]);
        }
        break;
      }
      default: {
        handleTyping(ime, m);
        break;
      }
    }
  }
}

const handleTyping = (ime: YTypingIme, message: ChatMessage) => {
  const userResult = ime.getUserResult(message.author);

  const result = ime.handleImeInput({
    value: message.message,
    currentWordIndex: userResult?.currentWordIndex,
    wordResults: userResult?.wordResults,
  });

  ime.updateUserResult(message.author, {
    name: message.author,
    typeCountDelta: result.typeCountDelta,
    newWordResults: result.newWordResults,
    nextWordIndex: result.nextWordIndex,
  });

  ime.addNotifications(
    result.appendNotifications.map((n) => `${message.author}: ${n}`),
  );

  const isWordComment = result.nextWordIndex !== userResult?.currentWordIndex;

  return { isWordComment };
};
