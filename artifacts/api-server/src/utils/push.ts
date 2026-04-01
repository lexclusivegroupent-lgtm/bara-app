const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

export async function sendPush(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter((m) => m.to && m.to.startsWith("ExponentPushToken["));
  if (valid.length === 0) return;

  try {
    const chunks: PushMessage[][] = [];
    for (let i = 0; i < valid.length; i += 100) {
      chunks.push(valid.slice(i, i + 100));
    }

    await Promise.all(
      chunks.map((chunk) =>
        fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(chunk.length === 1 ? chunk[0] : chunk),
        }).catch(() => {})
      )
    );
  } catch {
  }
}

export async function sendPushToUser(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!token) return;
  await sendPush([{ to: token, title, body, data, sound: "default" }]);
}
