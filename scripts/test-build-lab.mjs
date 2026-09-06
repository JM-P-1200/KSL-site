import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canAccessResource,
  completeStage,
  createProject,
  overallProgress,
  progressForStage,
  stageIsUnlocked,
  validateProject
} from "../build-lab/core.mjs";

const curriculum = JSON.parse(await readFile("data/build-lab.json", "utf8"));
const stages = curriculum.stages;
assert.equal(stages.length, 9, "all nine curriculum stages should exist");
assert.deepEqual(stages.map((stage) => stage.slug), ["discover", "plan", "build", "launch", "rank", "market", "monetize", "operate", "scale"]);

const invalid = validateProject({ projectName: "x", description: "short", audience: "", businessModel: "" });
assert.equal(invalid.valid, false, "malformed project submissions are rejected");
assert.ok(invalid.errors.projectName);
assert.ok(invalid.errors.businessModel);

const valid = validateProject({
  projectName: "Local service website",
  description: "A practical website for a local service business.",
  audience: "Families nearby",
  businessModel: "services",
  websiteUrl: "https://example.com"
});
assert.equal(valid.valid, true, "valid project submissions are accepted");

let project = createProject({
  projectName: "Local service website",
  description: "A practical website for a local service business.",
  audience: "Families nearby",
  businessModel: "services"
}, stages);

assert.equal(project.mode, "demo", "project uses demo isolation");
assert.equal(project.currentStage, "discover");
assert.equal(stageIsUnlocked(project, stages, "discover"), true);
assert.equal(stageIsUnlocked(project, stages, "plan"), false, "Plan is locked before Discover is complete");
assert.equal(overallProgress(project, stages), 0);

project = {
  ...project,
  tasks: { discover: { 0: true, 1: true, 2: true, 3: true } },
  worksheets: { discover: { skills: "Design", audience: "Shop owners", problem: "Need leads", validation: "Three interviews" } }
};
assert.equal(progressForStage(project, stages[0]), 100, "completing tasks updates stage progress");
project = completeStage(project, stages[0]);
assert.ok(project.completedStages.includes("discover"), "stage completion is recorded");
assert.equal(stageIsUnlocked(project, stages, "plan"), true, "next stage unlocks after prerequisite");
assert.equal(overallProgress(project, stages), 11, "overall progress averages all stages");

const freeResource = curriculum.resources.find((resource) => resource.access === "free");
const builderResource = curriculum.resources.find((resource) => resource.access === "builder");
const businessResource = curriculum.resources.find((resource) => resource.access === "business");
assert.equal(canAccessResource(freeResource, "free"), true, "free resources are available to free users");
assert.equal(canAccessResource(builderResource, "free"), false, "premium resources are gated");
assert.equal(canAccessResource(builderResource, "builder"), true, "builder users can access builder resources");
assert.equal(canAccessResource(businessResource, "builder"), false, "builder users cannot access business resources");
assert.equal(canAccessResource(businessResource, "business"), true, "business users can access business resources");

console.log("✓ Build Lab core tests passed.");
