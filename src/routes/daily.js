const { serializeDailyEntry } = require("../lib/tasks");
const { fromDateKey, toDateKey } = require("../lib/date");
const { getOrCreateDailyEntry } = require("../lib/dailyEntries");
const { getProfileIdFromRequest, profileFilter } = require("../lib/profile");

module.exports = async function registerDailyRoutes(fastify) {
  fastify.get("/api/daily", async (request, reply) => {
    const profileId = getProfileIdFromRequest(request);
    const dateQuery = request.query && request.query.date;
    let date = new Date();
    if (dateQuery) {
      const parsed = fromDateKey(String(dateQuery));
      if (!parsed) {
        return reply.code(400).send({ error: "Invalid date format." });
      }
      date = parsed;
    }

    const dateKey = toDateKey(date);
    const entry = await getOrCreateDailyEntry(
      fastify.collections,
      profileId,
      dateKey,
      date
    );
    return serializeDailyEntry(entry);
  });

  fastify.patch("/api/daily/:dateKey/:taskId", async (request, reply) => {
    const profileId = getProfileIdFromRequest(request);
    const { dateKey, taskId } = request.params || {};
    const date = fromDateKey(String(dateKey));
    if (!date) {
      return reply.code(400).send({ error: "Invalid date key." });
    }

    const payload = request.body || {};
    if (!Object.prototype.hasOwnProperty.call(payload, "value")) {
      return reply.code(400).send({ error: "Missing value." });
    }

    const entry = await getOrCreateDailyEntry(
      fastify.collections,
      profileId,
      dateKey,
      date
    );
    const items = entry.items || [];
    const itemIndex = items.findIndex((item) => item.taskId === taskId);
    if (itemIndex === -1) {
      return reply.code(404).send({ error: "Task not found." });
    }

    const item = items[itemIndex];
    item.value = payload.value;
    if (item.valueType === "bool") {
      item.completedAt = payload.value ? new Date().toISOString() : null;
    } else {
      item.completedAt = null;
    }

    const updatedAt = new Date().toISOString();
    const profileQuery = profileFilter(profileId);
    await fastify.collections.dailyEntriesCollection.updateOne(
      { ...profileQuery, dateKey },
      { $set: { items, updatedAt } }
    );

    return { ok: true, item };
  });
};
