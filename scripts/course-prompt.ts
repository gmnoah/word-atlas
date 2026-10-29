/** Offline prompt preparation: no network calls, credentials, or generated approvals. */
import { createDraftPrompt, type ProductionProfile } from "../src/courses/content-production.ts";

const [profile, ...targets] = process.argv.slice(2);
try {
  console.log(createDraftPrompt(profile as ProductionProfile, targets));
} catch {
  console.error("用法：npm run prompt:course -- primary-english apple banana 或 preschool-hanzi 山 水");
  process.exitCode = 1;
}
