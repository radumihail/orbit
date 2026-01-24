const { buildDailyItems } = require("./tasks");
const { getWeekdayMondayZero } = require("./date");

const getOrCreateDailyEntry = async (collections, dateKey, date) => {
  const { tasksCollection, dailyEntriesCollection } = collections;
  const existing = await dailyEntriesCollection.findOne({ dateKey });
  if (existing) {
    return existing;
  }

  const tasks = await tasksCollection.find({ active: true }).toArray();
  const weekday = getWeekdayMondayZero(date);
  const nowIso = new Date().toISOString();
  const items = buildDailyItems(tasks, dateKey, weekday, nowIso);
  const entry = {
    dateKey,
    date: date.toISOString(),
    items,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await dailyEntriesCollection.insertOne(entry);
  return entry;
};

module.exports = { getOrCreateDailyEntry };
