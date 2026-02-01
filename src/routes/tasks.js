const {
  buildDailyItems,
  defaultValueForType,
  generateTaskId,
  getNextSortOrder,
  normalizeValueType,
  parseRecurrence,
  taskOccursOn,
} = require("../lib/tasks");
const { getWeekdayMondayZero, toDateKey } = require("../lib/date");
const { getOrCreateDailyEntry, syncTaskForDate } = require("../lib/dailyEntries");
const { getProfileIdFromRequest, normalizeProfileId, profileFilter } = require("../lib/profile");

const parseProgress = (progress) => {
  if (!progress || typeof progress !== "object") {
    return { progress: null };
  }
  if (progress.enabled === true) {
    const target = Number(progress.target);
    if (!Number.isFinite(target)) {
      return { error: "Progress target must be a number." };
    }
    const allowedPeriods = new Set(["daily", "weekly", "monthly", "yearly"]);
    const period = allowedPeriods.has(progress.period)
      ? progress.period
      : "daily";
    return { progress: { enabled: true, target, period } };
  }
  if (progress.enabled === false) {
    return { progress: { enabled: false } };
  }
  return { progress: null };
};

module.exports = async function registerTasksRoutes(fastify) {
  fastify.get("/api/tasks", async (request) => {
    const profileId = getProfileIdFromRequest(request);
    const profileQuery = profileFilter(profileId);
    const tasks = await fastify.collections.tasksCollection
      .find({ ...profileQuery })
      .sort({ group: 1, sortOrder: 1, title: 1 })
      .toArray();
    return { tasks };
  });

  fastify.post("/api/tasks", async (request, reply) => {
    if (!fastify.collections) {
      return reply.code(500).send({ error: "Database not initialized." });
    }

    const profileId = getProfileIdFromRequest(request);
    const payload = request.body || {};
    let template = null;
    if (payload.templateId) {
      template = await fastify.collections.templatesCollection.findOne({
        templateId: String(payload.templateId),
      });
      if (!template) {
        return reply.code(404).send({ error: "Template not found." });
      }
    }

    const base = template || {};
    const title = String(payload.title || "").trim();
    const resolvedTitle = title || base.title;
    if (!resolvedTitle) {
      return reply.code(400).send({ error: "Title is required." });
    }

    const group = String(payload.group || base.group || "General").trim() || "General";
    const meta = String(payload.meta || base.meta || "").trim();
    const { recurrence, error } = parseRecurrence(
      payload.recurrence ? payload : { recurrence: base.recurrence }
    );
    if (error) {
      return reply.code(400).send({ error });
    }

    const progressResult = parseProgress(
      payload.progress !== undefined ? payload.progress : base.progress
    );
    if (progressResult.error) {
      return reply.code(400).send({ error: progressResult.error });
    }

    const valueType = normalizeValueType(payload.valueType || base.valueType);
    const defaultValue =
      payload.defaultValue !== undefined
        ? payload.defaultValue
        : defaultValueForType(valueType);
    const sortOrder = Number.isFinite(payload.sortOrder)
      ? payload.sortOrder
      : await getNextSortOrder(
          fastify.collections.tasksCollection,
          profileFilter(profileId),
          group
        );
    const nowIso = new Date().toISOString();

    const task = {
      profileId: normalizeProfileId(profileId),
      taskId: generateTaskId(resolvedTitle),
      title: resolvedTitle,
      group,
      meta,
      recurrence,
      valueType,
      defaultValue,
      sortOrder,
      active: payload.active !== false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (progressResult.progress) {
      task.progress = progressResult.progress;
    }

    await fastify.collections.tasksCollection.insertOne(task);

    const today = new Date();
    const dateKey = toDateKey(today);
    const weekday = getWeekdayMondayZero(today);
    const profileQuery = profileFilter(profileId);
    if (taskOccursOn(task, dateKey, weekday)) {
      const entry = await fastify.collections.dailyEntriesCollection.findOne({
        ...profileQuery,
        dateKey,
      });
      if (!entry) {
        await getOrCreateDailyEntry(fastify.collections, profileId, dateKey, today);
      } else {
        const items = entry.items || [];
        const exists = items.some((item) => item.taskId === task.taskId);
        if (!exists) {
          const [newItem] = buildDailyItems(
            [task],
            dateKey,
            weekday,
            nowIso
          );
          items.push(newItem);
          items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          await fastify.collections.dailyEntriesCollection.updateOne(
            { ...profileQuery, dateKey },
            { $set: { items, updatedAt: nowIso } }
          );
        }
      }
    }

    return { ok: true, task };
  });

  fastify.patch("/api/tasks/:taskId", async (request, reply) => {
    const profileId = getProfileIdFromRequest(request);
    const { taskId } = request.params || {};
    const profileQuery = profileFilter(profileId);
    const existing = await fastify.collections.tasksCollection.findOne({
      ...profileQuery,
      taskId,
    });
    if (!existing) {
      return reply.code(404).send({ error: "Task not found." });
    }

    const payload = request.body || {};
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload, "title")) {
      const title = String(payload.title || "").trim();
      if (!title) {
        return reply.code(400).send({ error: "Title is required." });
      }
      updates.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "group")) {
      updates.group = String(payload.group || "General").trim() || "General";
    }

    if (Object.prototype.hasOwnProperty.call(payload, "meta")) {
      updates.meta = String(payload.meta || "").trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sortOrder")) {
      const sortOrder = Number(payload.sortOrder);
      if (!Number.isFinite(sortOrder)) {
        return reply.code(400).send({ error: "Invalid sort order." });
      }
      updates.sortOrder = sortOrder;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "active")) {
      updates.active = payload.active === true;
    }

    let normalizedValueType = null;
    if (Object.prototype.hasOwnProperty.call(payload, "valueType")) {
      normalizedValueType = normalizeValueType(payload.valueType);
      updates.valueType = normalizedValueType;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "recurrence")) {
      const { recurrence, error } = parseRecurrence({
        recurrence: payload.recurrence,
      });
      if (error) {
        return reply.code(400).send({ error });
      }
      updates.recurrence = recurrence;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "defaultValue")) {
      updates.defaultValue = payload.defaultValue;
    } else if (
      normalizedValueType &&
      normalizedValueType !== existing.valueType
    ) {
      updates.defaultValue = defaultValueForType(normalizedValueType);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "progress")) {
      const progressResult = parseProgress(payload.progress);
      if (progressResult.error) {
        return reply.code(400).send({ error: progressResult.error });
      }
      updates.progress = progressResult.progress || { enabled: false };
    }

    updates.updatedAt = new Date().toISOString();

    await fastify.collections.tasksCollection.updateOne(
      { ...profileQuery, taskId },
      { $set: updates }
    );

    const updatedTask = { ...existing, ...updates };
    await syncTaskForDate(fastify.collections, updatedTask, new Date());

    return { ok: true, task: updatedTask };
  });

  fastify.delete("/api/tasks/:taskId", async (request, reply) => {
    const profileId = getProfileIdFromRequest(request);
    const { taskId } = request.params || {};
    const profileQuery = profileFilter(profileId);
    const existing = await fastify.collections.tasksCollection.findOne({
      ...profileQuery,
      taskId,
    });
    if (!existing) {
      return reply.code(404).send({ error: "Task not found." });
    }

    const deleteHistory =
      String(request.query?.deleteHistory || "false").toLowerCase() === "true";
    await fastify.collections.tasksCollection.deleteOne({
      ...profileQuery,
      taskId,
    });

    const todayKey = toDateKey(new Date());
    const nowIso = new Date().toISOString();
    const dateFilter = deleteHistory
      ? { ...profileQuery }
      : { ...profileQuery, dateKey: { $gte: todayKey } };
    await fastify.collections.dailyEntriesCollection.updateMany(
      dateFilter,
      { $pull: { items: { taskId } }, $set: { updatedAt: nowIso } }
    );

    return { ok: true };
  });
};
