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

  let succeededTaskCount = 0;
  for (const [index, task] of enabledTasks.entries()) {
    const taskStartedAt = now();
    emitLog(log, "task_started", { schedule, task: task.name });

    try {
      await task.run();
    } catch (error) {
      emitLog(log, "task_failed", {
        schedule,
        task: task.name,
        failureType: "task_execution_failed",
        durationMs: durationSince(taskStartedAt, now),
      });
      emitLog(log, "run_failed", {
        schedule,
        succeededTaskCount,
        failedTaskCount: 1,
        skippedTaskCount,
        skippedTasks,
        notStartedTaskCount: enabledTasks.length - index - 1,
        durationMs: durationSince(startedAt, now),
      });
      throw error;
    }

    succeededTaskCount += 1;
    emitLog(log, "task_completed", {
      schedule,
      task: task.name,
      durationMs: durationSince(taskStartedAt, now),
    });
  }

  emitLog(log, "run_completed", {
    schedule,
    succeededTaskCount,
    skippedTaskCount,
    skippedTasks,
    durationMs: durationSince(startedAt, now),
  });
}
