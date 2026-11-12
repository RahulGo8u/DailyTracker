const timeZone = "Asia/Kolkata";

export function formatClock(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
}

export function formatSpan(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDayKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export function activitySeconds(activity, now) {
  if (activity.status === "running") {
    return Math.max(0, Math.floor((now - new Date(activity.start_time).getTime()) / 1000));
  }
  return Math.max(0, activity.duration_seconds || 0);
}

export function withLiveTime(summary, extraSeconds) {
  if (!summary?.running || extraSeconds <= 0) return summary;
  const running = summary.running;
  const byCategory = summary.by_category.map((row) =>
    row.category_id === running.category_id ? { ...row, seconds: row.seconds + extraSeconds } : row,
  );
  if (!byCategory.some((row) => row.category_id === running.category_id)) {
    byCategory.push({
      category_id: running.category_id,
      category_name: running.category_name,
      seconds: extraSeconds,
    });
  }
  byCategory.sort((a, b) => b.seconds - a.seconds || a.category_name.localeCompare(b.category_name));
  const days = (summary.days || []).map((day) =>
    day.date === running.day ? { ...day, seconds: day.seconds + extraSeconds } : day,
  );
  return {
    ...summary,
    total_seconds: summary.total_seconds + extraSeconds,
    by_category: byCategory,
    days,
  };
}
