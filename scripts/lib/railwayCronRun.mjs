function emitLog(log, event, details) {
  log(JSON.stringify({
    component: "railway-cron",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

function durationSince(startedAt, now) {
  return Math.max(0, Math.round(now() - startedAt));
}

export function createRailwayGatedTask({ environment, name, requiredGateVariables, run }) {
  const disabledBy = requiredGateVariables.filter((variable) => environment[variable] !== "true");

  return {
    name,
    enabled: disabledBy.length === 0,
    disabledBy,
    run,
  };
}

export async function runRailwayCron({ schedule, tasks, log = console.log, now = Date.now }) {
  const enabledTasks = tasks.filter((task) => task.enabled);
  const skippedTasks = tasks
    .filter((task) => !task.enabled)
    .map((task) => ({
      name: task.name,
      disabledBy: Array.isArray(task.disabledBy) ? task.disabledBy : [],
    }));
  const skippedTaskCount = skippedTasks.length;
  const startedAt = now();

  emitLog(log, "run_started", {
    schedule,
    scheduledTaskCount: tasks.length,
    enabledTaskCount: enabledTasks.length,
    skippedTaskCount,
    skippedTasks,
  });

  // Each task's failure is isolated from the others: one bad job (e.g. a single
  // unreachable receipt-email address) must not stop unrelated jobs later in the
  // same run (e.g. the AI sweeper or subscription charging) from being attempted.
  // Every enabled task always runs; failures are collected and reported together,
  // and the run still throws at the end so Railway sees the run as failed.
  let succeededTaskCount = 0;
  const failedTasks = [];
  for (const task of enabledTasks) {
    const taskStartedAt = now();
    emitLog(log, "task_started", { schedule, task: task.name });

    try {
      await task.run();
      succeededTaskCount += 1;
      emitLog(log, "task_completed", {
        schedule,
        task: task.name,
        durationMs: durationSince(taskStartedAt, now),
      });
    } catch (error) {
      failedTasks.push({ name: task.name, error });
      emitLog(log, "task_failed", {
        schedule,
        task: task.name,
        failureType: "task_execution_failed",
        durationMs: durationSince(taskStartedAt, now),
      });
    }
  }

  if (failedTasks.length > 0) {
    emitLog(log, "run_failed", {
      schedule,
      succeededTaskCount,
      failedTaskCount: failedTasks.length,
      failedTasks: failedTasks.map((failure) => failure.name),
      skippedTaskCount,
      skippedTasks,
      notStartedTaskCount: 0,
      durationMs: durationSince(startedAt, now),
    });
    throw new AggregateError(
      failedTasks.map((failure) => failure.error),
      `${failedTasks.length} of ${enabledTasks.length} Railway "${schedule}" cron tasks failed: ` +
        failedTasks.map((failure) => failure.name).join(", "),
    );
  }

  emitLog(log, "run_completed", {
    schedule,
    succeededTaskCount,
    skippedTaskCount,
    skippedTasks,
    durationMs: durationSince(startedAt, now),
  });
}
