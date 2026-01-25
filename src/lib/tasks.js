const { addDays, fromDateKey, toDateKey } = require("./date");

const slugify = (value) => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task";
};

const generateTaskId = (title) => {
  const slug = slugify(title);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug}-${stamp}${rand}`;
};

const normalizeValueType = (valueType) => {
  if (valueType === "number" || valueType === "string") {
    return valueType;
  }
  return "bool";
};

const defaultValueForType = (valueType) => {
  if (valueType === "number") {
    return null;
  }
  if (valueType === "string") {
    return "";
  }
  return false;
};

const parseWeeklyDays = (days) => {
  if (!Array.isArray(days)) {
    return [];
  }
  const clean = days
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return Array.from(new Set(clean)).sort((a, b) => a - b);
};

const parseRecurrence = (payload) => {
  const recurrence =
    payload && typeof payload.recurrence === "object" ? payload.recurrence : {};
  const type = recurrence.type;

  if (type === "weekly") {
    const daysOfWeek = parseWeeklyDays(recurrence.daysOfWeek);
    if (daysOfWeek.length === 0) {
      return { error: "Weekly tasks require at least one day of week." };
    }
    return { recurrence: { type: "weekly", daysOfWeek } };
  }

  if (type === "interval") {
    const startDate = recurrence.startDate;
    const start = fromDateKey(String(startDate || ""));
    if (!start) {
      return { error: "Interval tasks require a valid start date." };
    }
    let endDate = null;
    if (recurrence.endDate) {
      const end = fromDateKey(String(recurrence.endDate));
      if (!end) {
        return { error: "Interval end date is invalid." };
      }
      if (toDateKey(end) < toDateKey(start)) {
        return { error: "Interval end date cannot be before start date." };
      }
      endDate = toDateKey(end);
    }
    return {
      recurrence: {
        type: "interval",
        startDate: toDateKey(start),
        endDate,
      },
    };
  }

  return { error: "Recurrence type must be weekly or interval." };
};

const buildSeedTasks = (baseDate) => {
  const todayKey = toDateKey(baseDate);
  const nextWeekKey = toDateKey(addDays(baseDate, 7));

  return [
    {
      taskId: "make-bed",
      title: "Make bed + open curtains",
      group: "Morning reset",
      meta: "5 min - low effort",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 1,
      active: true,
    },
    {
      taskId: "water-meds",
      title: "Water + meds",
      group: "Morning reset",
      meta: "2 min - no friction",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 2,
      active: true,
    },
    {
      taskId: "stretch",
      title: "10-minute stretch",
      group: "Morning reset",
      meta: "10 min - gentle",
      recurrence: { type: "weekly", daysOfWeek: [0, 2, 4] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 3,
      active: true,
    },
    {
      taskId: "daily-log",
      title: "Daily log",
      group: "Midday momentum",
      meta: "How did today feel?",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      valueType: "string",
      defaultValue: "",
      sortOrder: 1,
      active: true,
    },
    {
      taskId: "deep-work",
      title: "Deep work block",
      group: "Midday momentum",
      meta: "45 min - focus",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 2,
      active: true,
    },
    {
      taskId: "admin-cleanup",
      title: "Email + admin cleanup",
      group: "Midday momentum",
      meta: "15 min - quick wins",
      recurrence: { type: "weekly", daysOfWeek: [1, 3, 5] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 3,
      active: true,
    },
    {
      taskId: "log-weight",
      title: "Log weight",
      group: "Midday momentum",
      meta: "Morning weight (lbs)",
      recurrence: { type: "weekly", daysOfWeek: [0, 2, 4] },
      valueType: "number",
      defaultValue: null,
      sortOrder: 4,
      active: true,
    },
    {
      taskId: "walk",
      title: "Walk outside",
      group: "Evening close",
      meta: "20 min - reset",
      recurrence: { type: "interval", startDate: todayKey, endDate: nextWeekKey },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 1,
      active: true,
    },
    {
      taskId: "top-three",
      title: "Pick tomorrow's top 3",
      group: "Evening close",
      meta: "7 min - clarity",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 2,
      active: true,
    },
    {
      taskId: "tidy-desk",
      title: "Tidy desk + reset space",
      group: "Evening close",
      meta: "8 min - closure",
      recurrence: { type: "weekly", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 3,
      active: true,
    },
    {
      taskId: "one-off-call",
      title: "Call pharmacy",
      group: "Evening close",
      meta: "Single day task",
      recurrence: { type: "interval", startDate: todayKey, endDate: todayKey },
      valueType: "bool",
      defaultValue: false,
      sortOrder: 4,
      active: true,
    },
  ];
};

const taskOccursOn = (task, dateKey, weekday) => {
  const recurrence = task.recurrence || {};
  if (recurrence.type === "weekly") {
    const days = Array.isArray(recurrence.daysOfWeek)
      ? recurrence.daysOfWeek
      : [];
    return days.includes(weekday);
  }
  if (recurrence.type === "interval") {
    const startDate = recurrence.startDate;
    const endDate = recurrence.endDate || null;
    if (!startDate) {
      return false;
    }
    if (dateKey < startDate) {
      return false;
    }
    if (endDate && dateKey > endDate) {
      return false;
    }
    return true;
  }
  return false;
};

const buildDailyItems = (tasks, dateKey, weekday, nowIso) => {
  return tasks
    .filter((task) => task.active !== false)
    .filter((task) => taskOccursOn(task, dateKey, weekday))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((task) => {
      const valueType = task.valueType || "bool";
      let value = task.defaultValue;
      if (value === undefined) {
        value = defaultValueForType(valueType);
      }
      const completedAt =
        valueType === "bool" && value === true ? nowIso : null;
      return {
        taskId: task.taskId,
        title: task.title,
        group: task.group || "General",
        meta: task.meta || "",
        valueType,
        value,
        completedAt,
        sortOrder: task.sortOrder || 0,
      };
    });
};

const isItemComplete = (item) => {
  if (!item) {
    return false;
  }
  if (item.valueType === "bool") {
    return item.value === true;
  }
  if (item.valueType === "number") {
    return item.value !== null && item.value !== undefined && item.value !== "";
  }
  if (item.valueType === "string") {
    return typeof item.value === "string" && item.value.trim().length > 0;
  }
  return false;
};

const groupDailyItems = (items) => {
  const groups = [];
  const groupMap = new Map();
  items.forEach((item) => {
    const title = item.group || "General";
    if (!groupMap.has(title)) {
      const group = { title, tasks: [] };
      groupMap.set(title, group);
      groups.push(group);
    }
    groupMap.get(title).tasks.push(item);
  });
  return groups;
};

const serializeDailyEntry = (entry) => {
  return {
    date: entry.date,
    dateKey: entry.dateKey,
    groups: groupDailyItems(entry.items || []),
  };
};

const getNextSortOrder = async (tasksCollection, group) => {
  const latest = await tasksCollection
    .find({ group })
    .sort({ sortOrder: -1 })
    .limit(1)
    .toArray();
  if (!latest.length) {
    return 1;
  }
  const current = Number(latest[0].sortOrder) || 0;
  return current + 1;
};

module.exports = {
  buildSeedTasks,
  buildDailyItems,
  defaultValueForType,
  generateTaskId,
  getNextSortOrder,
  groupDailyItems,
  isItemComplete,
  normalizeValueType,
  parseRecurrence,
  serializeDailyEntry,
  taskOccursOn,
};
