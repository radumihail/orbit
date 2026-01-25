const { buildDailyItems, isItemComplete } = require("../lib/tasks");
const { fromDateKey, getWeekdayMondayZero, toDateKey } = require("../lib/date");

const getYearStart = (date) => new Date(date.getFullYear(), 0, 1);
const getYearEnd = (date) => new Date(date.getFullYear(), 11, 31);

const getDaysInMonth = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0).getDate();
};

const buildDayTotals = (date, tasks, entriesMap) => {
  const dateKey = toDateKey(date);
  const existing = entriesMap.get(dateKey);
  if (existing) {
    const items = existing.items || [];
    return {
      totalTasks: items.length,
      completedTasks: items.filter(isItemComplete).length,
    };
  }

  const weekday = getWeekdayMondayZero(date);
  const nowIso = new Date().toISOString();
  const items = buildDailyItems(tasks, dateKey, weekday, nowIso);
  return {
    totalTasks: items.length,
    completedTasks: items.filter(isItemComplete).length,
  };
};

module.exports = async function registerYearlyRoutes(fastify) {
  fastify.get("/api/yearly", async (request, reply) => {
    const dateQuery = request.query && request.query.date;
    let date = new Date();
    if (dateQuery) {
      const parsed = fromDateKey(String(dateQuery));
      if (!parsed) {
        return reply.code(400).send({ error: "Invalid date format." });
      }
      date = parsed;
    }

    const year = date.getFullYear();
    const yearStart = getYearStart(date);
    const yearEnd = getYearEnd(date);
    const startKey = toDateKey(yearStart);
    const endKey = toDateKey(yearEnd);

    const tasks = await fastify.collections.tasksCollection
      .find({ active: true })
      .toArray();
    const entries = await fastify.collections.dailyEntriesCollection
      .find({ dateKey: { $gte: startKey, $lte: endKey } })
      .toArray();
    const entriesMap = new Map(entries.map((entry) => [entry.dateKey, entry]));

    const months = [];
    for (let month = 0; month < 12; month += 1) {
      const monthStartDate = new Date(year, month, 1);
      const monthStartKey = toDateKey(monthStartDate);
      const monthEndKey = toDateKey(
        new Date(year, month, getDaysInMonth(year, month))
      );

      let totalTasks = 0;
      let completedTasks = 0;
      const daysInMonth = getDaysInMonth(year, month);
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dayDate = new Date(year, month, day);
        const totals = buildDayTotals(dayDate, tasks, entriesMap);
        totalTasks += totals.totalTasks;
        completedTasks += totals.completedTasks;
      }

      months.push({
        monthStart: monthStartKey,
        monthEnd: monthEndKey,
        totalTasks,
        completedTasks,
      });
    }

    return { year, months };
  });
};
