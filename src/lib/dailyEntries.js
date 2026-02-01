const {
  buildDailyItems,
  defaultValueForType,
  taskOccursOn,
} = require("./tasks");
const { getWeekdayMondayZero, toDateKey } = require("./date");
const { profileFilter, normalizeProfileId } = require("./profile");

const getOrCreateDailyEntry = async (collections, profileId, dateKey, date) => {
  const { tasksCollection, dailyEntriesCollection } = collections;
  const profileQuery = profileFilter(profileId);
  const existing = await dailyEntriesCollection.findOne({
    ...profileQuery,
    dateKey,
  });
  if (existing) {
    return existing;
  }

  const tasks = await tasksCollection
    .find({ ...profileQuery, active: true })
    .toArray();
  const weekday = getWeekdayMondayZero(date);
  const nowIso = new Date().toISOString();
  const items = buildDailyItems(tasks, dateKey, weekday, nowIso);
  const entry = {
    profileId: normalizeProfileId(profileId),
    dateKey,
    date: date.toISOString(),
    items,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await dailyEntriesCollection.insertOne(entry);
  return entry;
};

const syncTaskForDate = async (collections, task, date) => {
  const profileId = task.profileId || "default";
  const profileQuery = profileFilter(profileId);
  const dateKey = toDateKey(date);
  const weekday = getWeekdayMondayZero(date);
  const occursToday = taskOccursOn(task, dateKey, weekday);
  const nowIso = new Date().toISOString();

  let entry = await collections.dailyEntriesCollection.findOne({
    ...profileQuery,
    dateKey,
  });
  if (!entry && occursToday) {
    await getOrCreateDailyEntry(collections, profileId, dateKey, date);
    return;
  }
  if (!entry) {
    return;
  }

  const items = entry.items || [];
  const itemIndex = items.findIndex((item) => item.taskId === task.taskId);

  if (!occursToday) {
    if (itemIndex !== -1) {
      items.splice(itemIndex, 1);
      await collections.dailyEntriesCollection.updateOne(
        { ...profileQuery, dateKey },
        { $set: { items, updatedAt: nowIso } }
      );
    }
    return;
  }

  if (itemIndex === -1) {
    const [newItem] = buildDailyItems([task], dateKey, weekday, nowIso);
    items.push(newItem);
  } else {
    const existing = items[itemIndex];
    const nextValueType = task.valueType || "bool";
    const valueTypeChanged = existing.valueType !== nextValueType;
    const nextValue = valueTypeChanged
      ? defaultValueForType(nextValueType)
      : existing.value;
    const nextCompletedAt =
      nextValueType === "bool" && nextValue === true ? nowIso : null;

    items[itemIndex] = {
      ...existing,
      title: task.title,
      group: task.group || "General",
      meta: task.meta || "",
      valueType: nextValueType,
      sortOrder: task.sortOrder || 0,
      value: nextValue,
      completedAt: nextCompletedAt,
    };
  }

  items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  await collections.dailyEntriesCollection.updateOne(
    { ...profileQuery, dateKey },
    { $set: { items, updatedAt: nowIso } }
  );
};

module.exports = { getOrCreateDailyEntry, syncTaskForDate };
