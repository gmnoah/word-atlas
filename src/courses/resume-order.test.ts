import assert from "node:assert/strict";
import { test } from "node:test";
import { checkpointSavedAt } from "./resume-order";
test("checkpoint recency rejects damaged or future timestamps", () => {
 assert.equal(checkpointSavedAt(JSON.stringify({session:{lastTickAt:50}}),10,100),50);
 for(const value of [101,5,"50",null]) assert.equal(checkpointSavedAt(JSON.stringify({session:{lastTickAt:value}}),10,100),10);
 assert.equal(checkpointSavedAt("broken",10,100),10);
 assert.equal(checkpointSavedAt(JSON.stringify({session:{lastTickAt:120}}),110,100),0);
});
