// A semana aberta fica só neste aparelho (é uma surpresa, não um dado do casal).

const key = (userId: string) => `tumtum:semana-aberta:${userId}`;

/** A semana de hoje ainda não foi aberta. Na primeira vez, só guarda (não há o que embrulhar). */
export function weekGiftPending(userId: string, week: number) {
  try {
    const v = Number(localStorage.getItem(key(userId)));
    if (!v) {
      localStorage.setItem(key(userId), String(week));
      return false;
    }
    return v < week;
  } catch {
    return false;
  }
}

export function openWeekGift(userId: string, week: number) {
  try {
    localStorage.setItem(key(userId), String(week));
  } catch {
    // ignora
  }
}
