import type { SampleCourse } from "./types";
import { primaryFull } from "./primary-full";
import { hanziFull } from "./hanzi-full";

/** Build and audit aggregation; runtime loads one subject at a time. */
export const sampleCourses: SampleCourse[] = [primaryFull, hanziFull];
