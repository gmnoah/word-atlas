import { flush } from "../store/store";
import { profileStore } from "./store";
import { stopAudio } from "../lib/audio";
import { setAmbience } from "../lib/sound";

export interface CourseContextIdentity {
  profileId: string;
  courseId: string | null;
}

/**
 * Coordinates context transitions (switching learners or courses),
 * flushes pending state before transitions, and invalidates in-flight
 * asynchronous operations to prevent cross-learner/cross-course state pollution.
 */
export class ContextIsolationCoordinator {
  private currentToken = 0;
  private currentContext: CourseContextIdentity = {
    profileId: "learner-default",
    courseId: null,
  };
  private activeAbortController: AbortController | null = null;

  /**
   * Transition to a new context.
   * 1. Aborts any in-flight asynchronous operations from previous context.
   * 2. Flushes any dirty storage writes for the outgoing context.
   * 3. Stops playing audio.
   * 4. Issues a new monotonic token and a fresh AbortController.
   */
  switchContext(next: CourseContextIdentity): {
    token: number;
    controller: AbortController;
  } {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }

    flush();
    stopAudio();
    void setAmbience(null);

    this.currentContext = { ...next };
    this.currentToken++;
    const controller = new AbortController();
    this.activeAbortController = controller;

    return { token: this.currentToken, controller };
  }

  /**
   * Checks whether a token and context are still active and valid.
   * If the user switched learner or course in the meantime, this returns false.
   */
  isValid(token: number, context?: Partial<CourseContextIdentity>): boolean {
    if (token !== this.currentToken) return false;
    if (context?.profileId !== undefined && context.profileId !== this.currentContext.profileId) {
      return false;
    }
    if (context?.courseId !== undefined && context.courseId !== this.currentContext.courseId) {
      return false;
    }
    return true;
  }

  /**
   * Switch the active learner with full state flush and request isolation.
   */
  selectLearner(profileId: string): {
    token: number;
    controller: AbortController;
  } {
    flush();
    profileStore.select(profileId);
    return this.switchContext({
      profileId,
      courseId: this.currentContext.courseId,
    });
  }

  getCurrentContext(): Readonly<CourseContextIdentity> {
    return this.currentContext;
  }

  reset(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.currentToken++;
  }
}

export const contextCoordinator = new ContextIsolationCoordinator();
