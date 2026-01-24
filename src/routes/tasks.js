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
const { getOrCreateDailyEntry } = require("../lib/dailyEntries");

module.exports = async function registerTasksRoutes(fastify) {
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
};
