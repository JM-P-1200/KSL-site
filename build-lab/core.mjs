export const STORAGE_KEY = "ksl-build-lab-demo-project";
export const DEFAULT_ENTITLEMENT = "free";
export const TIER_ORDER = ["free", "builder", "business", "assisted", "managed"];

export function normalizeSlug(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function canAccessResource(resource, entitlement = DEFAULT_ENTITLEMENT) {
  if (!resource) return false;
  const required = resource.access || "free";
  return TIER_ORDER.indexOf(entitlement) >= TIER_ORDER.indexOf(required);
}

export function validateProject(input = {}) {
  const errors = {};
  const projectName = String(input.projectName || "").trim();
  const description = String(input.description || "").trim();
  const audience = String(input.audience || "").trim();
  const businessModel = String(input.businessModel || "").trim();
  if (projectName.length < 3) errors.projectName = "Project name needs at least 3 characters.";
  if (description.length < 10) errors.description = "Describe the project in at least 10 characters.";
  if (audience.length < 3) errors.audience = "Add a target audience.";
  if (!businessModel) errors.businessModel = "Choose a business model.";
  for (const field of ["websiteUrl", "repositoryUrl"]) {
    const value = String(input[field] || "").trim();
    if (value && !/^https?:\/\/[\w.-]+/i.test(value)) errors[field] = "Use a full URL beginning with http:// or https://.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function createProject(input = {}, stages = []) {
  const firstStage = stages[0]?.slug || "discover";
  const now = new Date().toISOString();
  return {
    id: "demo-project",
    mode: "demo",
    entitlement: input.entitlement || DEFAULT_ENTITLEMENT,
    learnerName: input.learnerName?.trim() || "KSL Builder",
    projectName: input.projectName?.trim() || "My first website business",
    description: input.description?.trim() || "A practical website project guided by KSL Build Lab.",
    niche: input.niche?.trim() || "",
    audience: input.audience?.trim() || "",
    businessModel: input.businessModel || "services",
    websiteUrl: input.websiteUrl?.trim() || "",
    repositoryUrl: input.repositoryUrl?.trim() || "",
    buildMethod: input.buildMethod || "no-code",
    currentStage: input.currentStage || firstStage,
    trafficTarget: Number(input.trafficTarget || 100),
    leadTarget: Number(input.leadTarget || 5),
    revenueTarget: Number(input.revenueTarget || 0),
    notes: input.notes?.trim() || "",
    tasks: {},
    worksheets: {},
    completedStages: [],
    milestones: [],
    metrics: { traffic: 0, leads: 0, revenue: 0 },
    createdAt: now,
    updatedAt: now,
    lastActivity: now
  };
}

export function progressForStage(project = {}, stage) {
  if (!stage) return 0;
  const taskState = project.tasks?.[stage.slug] || {};
  const completed = stage.tasks.filter((_, index) => taskState[index]).length;
  return stage.tasks.length ? Math.round((completed / stage.tasks.length) * 100) : 0;
}

export function overallProgress(project = {}, stages = []) {
  if (!stages.length) return 0;
  const total = stages.reduce((sum, stage) => sum + progressForStage(project, stage), 0);
  return Math.round(total / stages.length);
}

export function stageIsUnlocked(project = {}, stages = [], slug) {
  const index = stages.findIndex((stage) => stage.slug === slug);
  if (index <= 0) return true;
  return project.completedStages?.includes(stages[index - 1].slug);
}

export function completeStage(project = {}, stage) {
  if (!stage) return project;
  const completedStages = new Set(project.completedStages || []);
  if (progressForStage(project, stage) === 100) completedStages.add(stage.slug);
  const now = new Date().toISOString();
  return {
    ...project,
    completedStages: [...completedStages],
    currentStage: stage.slug,
    updatedAt: now,
    lastActivity: now,
    milestones: completedStages.has(stage.slug)
      ? [...(project.milestones || []).filter((item) => item.stage !== stage.slug), { stage: stage.slug, completedAt: now }]
      : project.milestones || []
  };
}
