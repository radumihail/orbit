const weekRange = document.getElementById("weekRange");
const weekSummary = document.getElementById("weekSummary");
const weekGrid = document.getElementById("weekGrid");

const formatDate = (date, options) => {
  return date.toLocaleDateString(undefined, options);
};

const formatWeekRange = (startDate, endDate) => {
  const startText = formatDate(startDate, {
    month: "short",
    day: "numeric",
  });
  const endText = formatDate(endDate, {
    month: "short",
    day: "numeric",
  });
  return `${startText} - ${endText}`;
};

const isTaskComplete = (task) => {
  if (task.valueType === "bool") {
    return task.value === true;
  }
  if (task.valueType === "number") {
    return task.value !== null && task.value !== undefined && task.value !== "";
  }
  if (task.valueType === "string") {
    return typeof task.value === "string" && task.value.trim().length > 0;
  }
  return false;
};

const sendUpdate = async (dateKey, taskId, value) => {
  try {
    await fetch(`/api/daily/${dateKey}/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
    });
  } catch (error) {
    console.error("Failed to update task:", error);
  }
};

const updateDayProgress = (card) => {
  const inputs = Array.from(card.querySelectorAll("[data-task-id]"));
  const total = inputs.length;
  const done = inputs.filter((input) => {
    if (input.type === "checkbox") {
      return input.checked;
    }
    if (input.dataset.valueType === "number") {
      return input.value !== "";
    }
    return input.value.trim().length > 0;
  }).length;
  const progress = card.querySelector(".day-progress");
  if (progress) {
    progress.textContent = `${done}/${total} done`;
  }
};

const updateWeekSummaryFromDom = () => {
  const inputs = Array.from(document.querySelectorAll("[data-task-id]"));
  const total = inputs.length;
  const done = inputs.filter((input) => {
    if (input.type === "checkbox") {
      return input.checked;
    }
    if (input.dataset.valueType === "number") {
      return input.value !== "";
    }
    return input.value.trim().length > 0;
  }).length;
  weekSummary.textContent = `${done}/${total} done this week`;
};

const wireInputs = () => {
  const checks = Array.from(document.querySelectorAll(".task-check"));
  checks.forEach((check) => {
    const item = check.closest(".task-item");
    check.addEventListener("change", () => {
      if (item) {
        item.classList.toggle("completed", check.checked);
      }
      sendUpdate(check.dataset.dateKey, check.dataset.taskId, check.checked);
      const card = check.closest(".day-card");
      if (card) {
        updateDayProgress(card);
      }
      updateWeekSummaryFromDom();
    });
    if (item) {
      item.classList.toggle("completed", check.checked);
    }
  });

  const values = Array.from(document.querySelectorAll(".task-value"));
  values.forEach((input) => {
    const sendValue = () => {
      let value = input.value;
      if (input.dataset.valueType === "number") {
        value = value === "" ? null : Number(value);
      }
      sendUpdate(input.dataset.dateKey, input.dataset.taskId, value);
      const card = input.closest(".day-card");
      if (card) {
        updateDayProgress(card);
      }
      updateWeekSummaryFromDom();
    };
    input.addEventListener("change", sendValue);
    input.addEventListener("blur", sendValue);
  });
};

const renderWeek = (payload) => {
  weekGrid.innerHTML = "";
  if (!payload || !payload.days || !payload.days.length) {
    weekGrid.innerHTML = '<div class="text-muted small">No entries yet.</div>';
    return;
  }

  const weekStartDate = new Date(payload.days[0].date);
  const weekEndDate = new Date(payload.days[payload.days.length - 1].date);
  weekRange.textContent = formatWeekRange(weekStartDate, weekEndDate);

  let totalTasks = 0;
  let totalDone = 0;

  payload.days.forEach((day) => {
    const dayDate = new Date(day.date);
    const dayLabel = formatDate(dayDate, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const dayCard = document.createElement("div");
    dayCard.className = "app-card day-card";

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("div");
    title.className = "day-title";
    title.textContent = dayLabel;

    const progress = document.createElement("div");
    progress.className = "day-progress";

    header.appendChild(title);
    header.appendChild(progress);
    dayCard.appendChild(header);

    const groups = day.groups || [];
    if (!groups.length) {
      const empty = document.createElement("div");
      empty.className = "text-muted small";
      empty.textContent = "No tasks.";
      dayCard.appendChild(empty);
      weekGrid.appendChild(dayCard);
      return;
    }

    groups.forEach((group) => {
      const groupTitle = document.createElement("div");
      groupTitle.className = "task-group-title";
      groupTitle.textContent = group.title;
      dayCard.appendChild(groupTitle);

      const list = document.createElement("ul");
      list.className = "task-list";

      (group.tasks || []).forEach((task) => {
        totalTasks += 1;
        if (isTaskComplete(task)) {
          totalDone += 1;
        }

        const taskId = task.taskId || task.id;
        const item = document.createElement("li");
        item.className = "task-item";

        if (task.valueType === "bool") {
          const control = document.createElement("div");
          control.className = "custom-control custom-checkbox";

          const input = document.createElement("input");
          input.type = "checkbox";
          input.className = "custom-control-input task-check";
          input.id = `week-${day.dateKey}-${taskId}`;
          input.checked = Boolean(task.value);
          input.dataset.taskId = taskId;
          input.dataset.dateKey = day.dateKey;

          const label = document.createElement("label");
          label.className = "custom-control-label";
          label.setAttribute("for", input.id);

          const taskTitle = document.createElement("span");
          taskTitle.className = "task-title";
          taskTitle.textContent = task.title;

          const taskMeta = document.createElement("span");
          taskMeta.className = "task-meta";
          taskMeta.textContent = task.meta || "";

          label.appendChild(taskTitle);
          label.appendChild(taskMeta);
          control.appendChild(input);
          control.appendChild(label);
          item.appendChild(control);
        } else {
          const row = document.createElement("div");
          row.className = "task-row";

          const text = document.createElement("div");
          text.className = "task-text";

          const taskTitle = document.createElement("span");
          taskTitle.className = "task-title";
          taskTitle.textContent = task.title;

          const taskMeta = document.createElement("span");
          taskMeta.className = "task-meta";
          taskMeta.textContent = task.meta || "";

          text.appendChild(taskTitle);
          text.appendChild(taskMeta);
          row.appendChild(text);

          if (task.valueType === "number") {
            const input = document.createElement("input");
            input.type = "number";
            input.className = "form-control form-control-sm task-value";
            input.value =
              task.value === null || task.value === undefined ? "" : task.value;
            input.dataset.taskId = taskId;
            input.dataset.dateKey = day.dateKey;
            input.dataset.valueType = "number";
            row.appendChild(input);
          } else {
            const input = document.createElement("textarea");
            input.className = "form-control form-control-sm task-value task-textarea";
            input.rows = 2;
            input.value = task.value || "";
            input.dataset.taskId = taskId;
            input.dataset.dateKey = day.dateKey;
            input.dataset.valueType = "string";
            row.appendChild(input);
          }

          item.appendChild(row);
        }

        list.appendChild(item);
      });

      dayCard.appendChild(list);
    });

    weekGrid.appendChild(dayCard);
    updateDayProgress(dayCard);
  });

  weekSummary.textContent = `${totalDone}/${totalTasks} done this week`;
  wireInputs();
};

const loadWeek = async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    const url = dateParam ? `/api/weekly?date=${encodeURIComponent(dateParam)}` : "/api/weekly";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load weekly tasks.");
    }
    const payload = await response.json();
    renderWeek(payload);
  } catch (error) {
    weekGrid.innerHTML = '<div class="text-muted small">Unable to load week.</div>';
    weekRange.textContent = "Unavailable";
    weekSummary.textContent = "Unavailable";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadWeek();
});
