import { logSetup, logSetupError, logSetupWarn } from "./logging.js";

export type SetupStepId =
  | "folder"
  | "quick"
  | "cloud"
  | "shell"
  | "provider"
  | "engine"
  | "done";

export type SetupStepStatus = "pending" | "running" | "ok" | "warning" | "error";

export type SetupStepProgress = {
  id: SetupStepId;
  label: string;
  pct: number;
  status: SetupStepStatus;
  message?: string;
  warning?: string;
};

export type SetupResult = {
  completed: boolean;
  version: string;
  schema: string;
  completedAt: string;
  steps: Record<SetupStepId, SetupStepStatus>;
  warnings: Array<{ id: SetupStepId; message: string }>;
};

type SetupTask = {
  id: SetupStepId;
  label: string;
  endPct: number;
  optional?: boolean;
  minDurationMs?: number;
  run: () => Promise<void>;
};

export type SetupOrchestratorOptions = {
  version: string;
  schema: string;
  initialPct?: number;
  tasks: SetupTask[];
  onProgress: (progress: SetupStepProgress) => void;
  // Floor on how long each step stays visible, so steps that finish instantly
  // (everything already configured on this machine) still animate instead of
  // flashing past. Per-task minDurationMs overrides this.
  minStepDurationMs?: number;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function runSetupOrchestrator(options: SetupOrchestratorOptions) {
  const steps = Object.fromEntries(
    options.tasks.map((task) => [task.id, "pending"]),
  ) as Record<SetupStepId, SetupStepStatus>;
  const warnings: SetupResult["warnings"] = [];
  let previousPct = clampPct(options.initialPct ?? 0);

  for (const task of options.tasks) {
    steps[task.id] = "running";
    const startedAt = Date.now();
    const minDurationMs = task.minDurationMs ?? options.minStepDurationMs ?? 0;
    const startPct = previousPct;
    const endPct = Math.max(startPct, clampPct(task.endPct));
    let visualPct = startPct;
    const targetWhileRunning = Math.max(startPct, endPct - 2);
    logSetup("orchestrator", "step start", {
      id: task.id,
      label: task.label,
      startPct: Math.round(startPct),
      endPct,
    });
    options.onProgress({
      id: task.id,
      label: task.label,
      pct: Math.round(startPct),
      status: "running",
    });

    const timer = setInterval(() => {
      if (visualPct >= targetWhileRunning) return;
      const remaining = targetWhileRunning - visualPct;
      visualPct += Math.max(0.25, remaining * 0.08);
      options.onProgress({
        id: task.id,
        label: task.label,
        pct: Math.min(Math.round(visualPct), targetWhileRunning),
        status: "running",
      });
    }, 180);

    try {
      await task.run();
      const remaining = minDurationMs - (Date.now() - startedAt);
      if (remaining > 0) await delay(remaining);
      clearInterval(timer);
      steps[task.id] = "ok";
      previousPct = endPct;
      logSetup("orchestrator", "step ok", {
        id: task.id,
        pct: endPct,
        durationMs: Date.now() - startedAt,
      });
      options.onProgress({
        id: task.id,
        label: task.label,
        pct: endPct,
        status: "ok",
      });
    } catch (error) {
      clearInterval(timer);
      const message = errorMessage(error);
      if (!task.optional) {
        steps[task.id] = "error";
        logSetupError("orchestrator", "step error", {
          id: task.id,
          pct: Math.round(visualPct),
          durationMs: Date.now() - startedAt,
          message,
        });
        options.onProgress({
          id: task.id,
          label: task.label,
          pct: Math.round(visualPct),
          status: "error",
          message,
        });
        throw error;
      }

      const remaining = minDurationMs - (Date.now() - startedAt);
      if (remaining > 0) await delay(remaining);
      steps[task.id] = "warning";
      warnings.push({ id: task.id, message });
      previousPct = endPct;
      logSetupWarn("orchestrator", "step warning", {
        id: task.id,
        pct: endPct,
        durationMs: Date.now() - startedAt,
        message,
      });
      options.onProgress({
        id: task.id,
        label: task.label,
        pct: endPct,
        status: "warning",
        warning: message,
      });
    }
  }

  return {
    completed: true,
    version: options.version,
    schema: options.schema,
    completedAt: new Date().toISOString(),
    steps,
    warnings,
  } satisfies SetupResult;
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
