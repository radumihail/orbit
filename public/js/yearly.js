const yearSummary = document.getElementById("yearSummary");
const yearGrid = document.getElementById("yearGrid");
const yearPicker = document.getElementById("yearPicker");

let currentYear = null;

const monthName = (date) => {
  return date.toLocaleDateString(undefined, { month: "long" });
};

const renderYear = (payload) => {
  yearGrid.innerHTML = "";
  if (!payload || !payload.months || !payload.months.length) {
    yearGrid.innerHTML = '<div class="text-muted small">No entries yet.</div>';
    return;
  }

  currentYear = Number(payload.year) || null;
  if (yearPicker && currentYear !== null) {
    yearPicker.value = String(currentYear);
  }

  let totalTasks = 0;
  let totalDone = 0;

  payload.months.forEach((month) => {
    totalTasks += month.totalTasks;
    totalDone += month.completedTasks;
  });

  yearSummary.textContent = `${totalDone}/${totalTasks} done this year`;

  payload.months.forEach((month) => {
    const card = document.createElement("div");
    card.className = "year-card";

    const title = document.createElement("div");
    title.className = "year-card-title";
    title.textContent = monthName(new Date(month.monthStart));

    const meta = document.createElement("div");
    meta.className = "year-card-meta";
    meta.textContent = `${month.completedTasks}/${month.totalTasks} done`;

    const progress = document.createElement("div");
    progress.className = "year-progress";
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const percent = month.totalTasks
      ? Math.round((month.completedTasks / month.totalTasks) * 100)
      : 0;
    bar.style.width = `${percent}%`;
    progress.appendChild(bar);

    const link = document.createElement("a");
    link.href = `monthly.html?date=${month.monthStart}`;
    link.className = "month-day-link";
    link.appendChild(title);
    link.appendChild(meta);
    link.appendChild(progress);

    card.appendChild(link);
    yearGrid.appendChild(card);
  });
};

const loadYear = async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    const yearParam = dateParam && /^\d{4}$/.test(dateParam) ? dateParam : null;
    const url = yearParam
      ? `/api/yearly?date=${encodeURIComponent(`${yearParam}-01-01`)}`
      : "/api/yearly";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load yearly tasks.");
    }
    const payload = await response.json();
    renderYear(payload);
  } catch (error) {
    yearGrid.innerHTML = '<div class="text-muted small">Unable to load year.</div>';
    if (yearSummary) {
      yearSummary.textContent = "Unavailable";
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadYear();
  if (yearPicker) {
    yearPicker.addEventListener("change", () => {
      const yearValue = Number(yearPicker.value);
      if (!Number.isFinite(yearValue)) {
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.set("date", `${yearValue}-01-01`);
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
      loadYear();
    });
  }
});
