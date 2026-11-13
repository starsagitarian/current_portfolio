const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-02` as `Feb 2026`. */
export function formatMonth(month: string): string {
  const [year = "", index = "1"] = month.split("-");
  return `${MONTHS[Number(index) - 1] ?? ""} ${year}`.trim();
}

/** `Feb 2026 – Sep 2026`, or `– Present` while the role is current. */
export function formatSpan(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end === null ? "Present" : formatMonth(end)}`;
}
