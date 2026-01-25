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

module.exports = async function registerTasksRoutes(fastify) {
  fastify.get("/api/tasks", async () => {
    const tasks = await fastify.collections.tasksCollection
      .find({})
      .sort({ group: 1, sortOrder: 1, title: 1 })
      .toArray();
    return { tasks };
  });

  fastify.post("/api/tasks", async (request, reply) => {
    if (!fastify.collections) {
      return reply.code(500).send({ error: "Database not initialized." });
    }

    const payload = request.body || {};
    const title = String(payload.title || "").trim();
    if (!title) {
      return reply.code(400).send({ error: "Title is required." });
    }

    const group = String(payload.group || "General").trim() || "General";
    const meta = String(payload.meta || "").trim();
    const { recurrence, error } = parseRecurrence(payload);
    if (error) {
      return reply.code(400).send({ error });
    }

    const valueType = normalizeValueType(payload.valueType);
    const defaultValue =
      payload.defaultValue !== undefined
        ? payload.defaultValue
        : defaultValueForType(valueType);
    const sortOrder = Number.isFinite(payload.sortOrder)
      ? payload.sortOrder
      : await getNextSortOrder(fastify.collections.tasksCollection, group);
    const nowIso = new Date().toISOString();

    const task = {
      taskId: generateTaskId(title),
      title,
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

    await fastify.collections.tasksCollection.insertOne(task);

    const today = new Date();
    const dateKey = toDateKey(today);
    const weekday = getWeekdayMondayZero(today);
    if (taskOccursOn(task, dateKey, weekday)) {
      const entry = await fastify.collections.dailyEntriesCollection.findOne({
        dateKey,
      });
      if (!entry) {
        await getOrCreateDailyEntry(fastify.collections, dateKey, today);
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
            { dateKey },
            { $set: { items, updatedAt: nowIso } }
          );
        }
      }
    }

    return { ok: true, task };
  });

  fastify.patch("/api/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params || {};
    const existing = await fastify.collections.tasksCollection.findOne({
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

    updates.updatedAt = new Date().toISOString();

    await fastify.collections.tasksCollection.updateOne(
      { taskId },
      { $set: updates }
    );

    const updatedTask = { ...existing, ...updates };
    await syncTaskForDate(fastify.collections, updatedTask, new Date());

    return { ok: true, task: updatedTask };
  });

  fastify.delete("/api/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params || {};
    const existing = await fastify.collections.tasksCollection.findOne({
      taskId,
    });
    if (!existing) {
      return reply.code(404).send({ error: "Task not found." });
    }

    const deleteHistory =
      String(request.query?.deleteHistory || "false").toLowerCase() === "true";
    await fastify.collections.tasksCollection.deleteOne({ taskId });

    const todayKey = toDateKey(new Date());
    const nowIso = new Date().toISOString();
    const dateFilter = deleteHistory ? {} : { dateKey: { $gte: todayKey } };
    await fastify.collections.dailyEntriesCollection.updateMany(
      dateFilter,
      { $pull: { items: { taskId } }, $set: { updatedAt: nowIso } }
    );

    return { ok: true };
  });
};
