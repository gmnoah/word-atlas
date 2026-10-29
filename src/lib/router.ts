import { useSyncExternalStore } from "react";
import { transition } from "./motion";

export type Route =
  | { page: "today" }
  | { page: "atlas"; topic?: string; level?: string; q?: string; view?: string }
  | { page: "learn" }
  | { page: "practice" }
  | { page: "me" }
  | { page: "explore"; courseId?: string; entryId?: string; view?: "journey" | "atlas" | "records" }
  | { page: "about" };

export interface Location {
  route: Route;
  /** Word sheet open on top of the route. */
  word: string | null;
}

export function parseLocation(hash: string): Location {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  const word = params.get("w");
  const seg = path.split("/").filter(Boolean);
  let route: Route = { page: "today" };
  if (seg[0] === "atlas")
    route = { page: "atlas", topic: params.get("topic") || undefined, level: params.get("level") || undefined, q: params.get("q") || undefined, view: params.get("view") || undefined };
  else if (seg[0] === "learn") route = { page: "learn" };
  else if (seg[0] === "practice") route = { page: "practice" };
  else if (seg[0] === "me") route = { page: "me" };
  else if (seg[0] === "about") route = { page: "about" };
  else if (seg[0] === "explore")
    route = {
      page: "explore",
      courseId: params.get("course") || undefined,
      entryId: params.get("entry") || undefined,
      ...(params.get("view") === "journey" || params.get("view") === "atlas" || params.get("view") === "records"
        ? { view: params.get("view") as "journey" | "atlas" | "records" } : {}),
    };
  else if (seg[0] === "w" && seg[1]) {
    try {
      return { route: { page: "atlas" }, word: decodeURIComponent(seg[1]) };
    } catch {
      return { route: { page: "atlas" }, word: null };
    }
  }
  return { route, word };
}

export function href(route: Route, word?: string | null) {
  const params = new URLSearchParams();
  if (route.page === "atlas") {
    if (route.topic) params.set("topic", route.topic);
    if (route.level) params.set("level", route.level);
    if (route.q) params.set("q", route.q);
    if (route.view) params.set("view", route.view);
  }
  if (route.page === "explore") {
    if (route.courseId) params.set("course", route.courseId);
    if (route.entryId) params.set("entry", route.entryId);
    if (route.view) params.set("view", route.view);
  }
  if (word) params.set("w", word);
  const q = params.toString();
  return `#/${route.page === "today" ? "" : route.page}${q ? `?${q}` : ""}`;
}

let loc = parseLocation(typeof location === "undefined" ? "#/" : location.hash);
const subs = new Set<() => void>();
if (typeof window !== "undefined") window.addEventListener("hashchange", () => {
  const next = parseLocation(location.hash);
  const pageChange = next.route.page !== loc.route.page;
  const update = () => {
    loc = next;
    subs.forEach((f) => f());
  };
  // Crossfade between pages; the word sheet animates on its own.
  if (pageChange && !next.word) transition(update);
  else update();
});

export const useLocation = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => loc,
  );

export function go(route: Route, word?: string | null, replace = false) {
  const h = href(route, word);
  if (replace) history.replaceState(null, "", h);
  else history.pushState(null, "", h);
  const next = parseLocation(h);
  const pageChange = next.route.page !== loc.route.page;
  const update = () => {
    loc = next;
    subs.forEach((f) => f());
  };
  if (pageChange && !replace) transition(update);
  else update();
}

export const openWord = (id: string) => go(loc.route, id);
export const closeWord = () => go(loc.route, null);
export const currentLocation = () => loc;
