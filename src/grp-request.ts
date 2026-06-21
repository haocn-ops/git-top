export type GrpMode = "plan" | "compare" | "find" | "compose";
export type GrpComplexity = "low" | "medium" | "high";

export interface GrpRequest {
  goal: string;
  mode?: GrpMode;
  constraints?: GrpConstraints;
  context?: GrpContext;
}

export interface GrpConstraints {
  deploy?: string[];
  license?: string;
  complexity?: GrpComplexity;
  agent_ready?: boolean;
  language?: string;
  category?: string;
}

export interface GrpContext {
  previous_selected_projects?: string[];
  current_stack?: string[];
}

const validModes = new Set<GrpMode>(["plan", "compare", "find", "compose"]);

export function normalizeGrpRequest(input: unknown): { ok: true; request: Required<Pick<GrpRequest, "goal" | "mode">> & GrpRequest } | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "GRP request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) {
    return { ok: false, message: "GRP request requires a non-empty goal." };
  }

  const mode = typeof body.mode === "string" && validModes.has(body.mode as GrpMode) ? (body.mode as GrpMode) : body.mode === undefined ? "plan" : null;
  if (!mode) {
    return { ok: false, message: "GRP mode must be one of: plan, compare, find, compose." };
  }

  return {
    ok: true,
    request: {
      goal,
      mode,
      constraints: normalizeConstraints(body.constraints),
      context: normalizeContext(body.context)
    }
  };
}

function normalizeConstraints(input: unknown): GrpConstraints | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as Record<string, unknown>;
  const complexity = typeof value.complexity === "string" && ["low", "medium", "high"].includes(value.complexity) ? (value.complexity as GrpComplexity) : undefined;
  return {
    deploy: Array.isArray(value.deploy) ? value.deploy.filter((item): item is string => typeof item === "string").map(normalizeToken) : undefined,
    license: typeof value.license === "string" ? normalizeToken(value.license) : undefined,
    complexity,
    agent_ready: typeof value.agent_ready === "boolean" ? value.agent_ready : undefined,
    language: typeof value.language === "string" ? normalizeToken(value.language) : undefined,
    category: typeof value.category === "string" ? normalizeToken(value.category) : undefined
  };
}

function normalizeContext(input: unknown): GrpContext | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = input as Record<string, unknown>;
  return {
    previous_selected_projects: Array.isArray(value.previous_selected_projects)
      ? value.previous_selected_projects.filter((item): item is string => typeof item === "string")
      : undefined,
    current_stack: Array.isArray(value.current_stack) ? value.current_stack.filter((item): item is string => typeof item === "string") : undefined
  };
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}
