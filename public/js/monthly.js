const monthSummary = document.getElementById("monthSummary");
const monthGrid = document.getElementById("monthGrid");
const monthPicker = document.getElementById("monthPicker");

let currentMonthDate = null;

const mondayIndex = (date) => {
  return (date.getDay() + 6) % 7;
};

const toMonthValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthParam = (value) => {
  if (!value) {
    return new Date();
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
};

const updateUrlMonth = (date) => {
  const params = new URLSearchParams(window.location.search);
  params.set("date", `${toMonthValue(date)}-01`);
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
};

const renderMonth = (payload) => {
  monthGrid.innerHTML = "";
  if (!payload || !payload.days || !payload.days.length) {
    monthGrid.innerHTML = '<div class="text-muted small">No entries yet.</div>';
    return;
  }

  const firstDate = new Date(payload.days[0].date);
  currentMonthDate = firstDate;
  if (monthPicker) {
    monthPicker.value = toMonthValue(firstDate);
  }

  let totalTasks = 0;
  let totalDone = 0;

  payload.days.forEach((day) => {
    totalTasks += day.totalTasks;
    totalDone += day.completedTasks;
  });

  monthSummary.textContent = `${totalDone}/${totalTasks} done this month`;

  const offset = mondayIndex(firstDate);
  for (let i = 0; i < offset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "month-day empty";
    monthGrid.appendChild(empty);
  }

  payload.days.forEach((day) => {
    const dayDate = new Date(day.date);
    const dayNumber = dayDate.getDate();
    const dayCell = document.createElement("div");
    dayCell.className = "month-day";

    const link = document.createElement("a");
    link.className = "month-day-link";
    link.href = `index.html?date=${day.dateKey}`;

    const header = document.createElement("div");
    header.className = "month-day-header";

    const number = document.createElement("div");
    number.className = "month-day-number";
    number.textContent = dayNumber;

    const progress = document.createElement("div");
    progress.className = "month-day-progress";
    progress.textContent = `${day.completedTasks}/${day.totalTasks}`;

    header.appendChild(number);
    header.appendChild(progress);

    link.appendChild(header);
    dayCell.appendChild(link);
    monthGrid.appendChild(dayCell);
  });
};

const loadMonth = async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    const targetDate = parseMonthParam(dateParam);
    updateUrlMonth(targetDate);
    const url = `/api/monthly?date=${encodeURIComponent(`${toMonthValue(targetDate)}-01`)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load monthly tasks.");
    }
    const payload = await response.json();
    renderMonth(payload);
  } catch (error) {
    monthGrid.innerHTML = '<div class="text-muted small">Unable to load month.</div>';
    if (monthSummary) {
      monthSummary.textContent = "Unavailable";
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadMonth();
  if (monthPicker) {
    monthPicker.addEventListener("change", () => {
      const value = monthPicker.value;
      const targetDate = parseMonthParam(value);
      updateUrlMonth(targetDate);
      loadMonth();
    });
  }
});
