/** Session flag after successful unlock (browser tab). */
export const BOT_START_UNLOCK_STORAGE_KEY = "bot_trading_start_unlocked";

/** Override via NEXT_PUBLIC_BOT_START_PASSWORD in .env */
export function getExpectedBotStartPassword(): string {
  return process.env.NEXT_PUBLIC_BOT_START_PASSWORD ?? "Test123@";
}

export function readBotStartUnlockedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(BOT_START_UNLOCK_STORAGE_KEY) === "1";
}

export function writeBotStartUnlockedToStorage(): void {
  sessionStorage.setItem(BOT_START_UNLOCK_STORAGE_KEY, "1");
}
