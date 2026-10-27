import { createContext, useContext, useEffect, useState } from "react";
import type { Atlas, Course, Entry, LearningEntry } from "./types";
import { createLegacyCourseAdapter } from "./data";

export const AtlasContext = createContext<Atlas | null>(null);

export function useAtlas() {
  const a = useContext(AtlasContext);
  if (!a) throw new Error("Atlas not loaded");
  return a;
}

/** Full entry for an id; returns the cached copy synchronously when available. */
export function useEntry(id: string | null | undefined) {
  const atlas = useAtlas();
  const [entry, setEntry] = useState<Entry | undefined>(() => (id ? atlas.peek(id) : undefined));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setEntry(undefined);
      setError(null);
      return;
    }
    const hit = atlas.peek(id);
    setEntry(hit);
    setError(null);
    if (hit) return;

    let live = true;
    atlas.entry(id).then(
      (e) => {
        if (live) setEntry(e);
      },
      (e: Error) => {
        if (live) setError(e.message);
      },
    );
    return () => {
      live = false;
    };
  }, [atlas, id]);

  return { entry: entry?.id === id ? entry : undefined, error };
}

/** Warm the chunks for a list of ids (e.g. a learning session). */
export function prefetch(atlas: Atlas, ids: string[]) {
  return Promise.all(ids.map((id) => atlas.entry(id).catch(() => null)));
}

export const CourseContext = createContext<Course | null>(null);

export function useCourse(): Course {
  const c = useContext(CourseContext);
  if (c) return c;
  const a = useContext(AtlasContext);
  if (a) return createLegacyCourseAdapter(a);
  throw new Error("Course not loaded");
}

export function useCourseEntry(id: string | null | undefined) {
  const course = useCourse();
  const [entry, setEntry] = useState<Entry | LearningEntry | undefined>(() =>
    id ? course.peek(id) : undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setEntry(undefined);
      setError(null);
      setLoading(false);
      return;
    }
    const hit = course.peek(id);
    if (hit) {
      setEntry(hit);
      setError(null);
      setLoading(false);
      return;
    }

    let live = true;
    setLoading(true);
    setError(null);

    course.entry(id).then(
      (e) => {
        if (live) {
          setEntry(e);
          setLoading(false);
        }
      },
      (err: Error) => {
        if (live) {
          setError(err.message);
          setLoading(false);
        }
      },
    );

    return () => {
      live = false;
    };
  }, [course, id]);

  const matches = entry && ("id" in entry ? entry.id === id : (entry as Entry).w === id);
  return { entry: matches ? entry : undefined, error, loading };
}

export function prefetchCourse(course: Course, ids: string[]) {
  return Promise.all(ids.map((id) => course.entry(id).catch(() => null)));
}
