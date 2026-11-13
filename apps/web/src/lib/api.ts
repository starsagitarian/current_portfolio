/**
 * Where the web server reaches the API: inside Docker, the API container's own address; on the
 * hosting platform, the API deployment that goes out with this one (set by the deploy workflow).
 */
export function apiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
}
