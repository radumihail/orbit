const { serializeDailyEntry } = require("../lib/tasks");
const {
  addDays,
  fromDateKey,
  getWeekdayMondayZero,
  toDateKey,
} = require("../lib/date");
const { getOrCreateDailyEntry } = require("../lib/dailyEntries");

const getWeekStart = (date) => {
  const offset = getWeekdayMondayZero(date);
  return addDays(date, -offset);
};

const buildWeekDates = (startDate) => {
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
};

module.exports = async function registerWeeklyRoutes(fastify) {
  fastify.get("/api/weekly", async (request, reply) => {
    const dateQuery = request.query && request.query.date;
    let date = new Date();
    if (dateQuery) {
      const parsed = fromDateKey(String(dateQuery));
      if (!parsed) {
        return reply.code(400).send({ error: "Invalid date format." });
      }
      date = parsed;
    }

    const weekStart = getWeekStart(date);
    const weekDates = buildWeekDates(weekStart);

    const days = [];
    for (const dayDate of weekDates) {
      const dateKey = toDateKey(dayDate);
      const entry = await getOrCreateDailyEntry(
        fastify.collections,
        dateKey,
        dayDate
      );
      days.push(serializeDailyEntry(entry));
    }

    const weekStartKey = toDateKey(weekStart);
    const weekEndKey = toDateKey(addDays(weekStart, 6));

    return {
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      days,
    };
  });
};
