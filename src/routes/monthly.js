const { buildDailyItems, isItemComplete } = require("../lib/tasks");
const { fromDateKey, getWeekdayMondayZero, toDateKey } = require("../lib/date");

const getMonthStart = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getMonthEnd = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const getDaysInMonth = (date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const buildDaySummary = (date, tasks, entriesMap) => {
  const dateKey = toDateKey(date);
  const existing = entriesMap.get(dateKey);
  if (existing) {
    const items = existing.items || [];
    const totalTasks = items.length;
    const completedTasks = items.filter(isItemComplete).length;
    return {
      dateKey,
      date: existing.date,
      totalTasks,
      completedTasks,
    };
  }

  const weekday = getWeekdayMondayZero(date);
  const nowIso = new Date().toISOString();
  const items = buildDailyItems(tasks, dateKey, weekday, nowIso);
  return {
    dateKey,
    date: date.toISOString(),
    totalTasks: items.length,
    completedTasks: items.filter(isItemComplete).length,
  };
};

module.exports = async function registerMonthlyRoutes(fastify) {
  fastify.get("/api/monthly", async (request, reply) => {
    const dateQuery = request.query && request.query.date;
    let date = new Date();
    if (dateQuery) {
      const parsed = fromDateKey(String(dateQuery));
      if (!parsed) {
        return reply.code(400).send({ error: "Invalid date format." });
      }
      date = parsed;
    }

    const monthStart = getMonthStart(date);
    const monthEnd = getMonthEnd(date);
    const startKey = toDateKey(monthStart);
    const endKey = toDateKey(monthEnd);

    const tasks = await fastify.collections.tasksCollection
      .find({ active: true })
      .toArray();
    const entries = await fastify.collections.dailyEntriesCollection
      .find({ dateKey: { $gte: startKey, $lte: endKey } })
      .toArray();
    const entriesMap = new Map(entries.map((entry) => [entry.dateKey, entry]));

    const days = [];
    const totalDays = getDaysInMonth(date);
    for (let day = 1; day <= totalDays; day += 1) {
      const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
      days.push(buildDaySummary(dayDate, tasks, entriesMap));
    }

    return {
      monthStart: startKey,
      monthEnd: endKey,
      days,
    };
  });
};
