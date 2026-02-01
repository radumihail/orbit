const progressBar = document.getElementById("dailyProgress");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const todayDate = document.getElementById("todayDate");
const dateLabel = document.getElementById("dateLabel");
const datePicker = document.getElementById("datePicker");
const taskGroups = document.getElementById("taskGroups");
let taskChecks = [];
let currentDateKey = null;
let currentDateValue = null;
const statusTimers = new Map();

const withProfile = (url) => {
  if (window.profile && typeof window.profile.withProfile === "function") {
    return window.profile.withProfile(url);
  }
  return url;
};

const waitForProfile = async () => {
  if (window.profile && window.profile.ready) {
    await window.profile.ready;
  }
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const updateUrlDate = (dateKey) => {
  const params = new URLSearchParams(window.location.search);
  if (dateKey) {
    params.set("date", dateKey);
  } else {
    params.delete("date");
  }
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
};

const updateProgress = () => {
  const total = taskChecks.length;
  const done = taskChecks.filter((check) => check.checked).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", String(percent));
  progressText.textContent = `${done} of ${total} complete`;
  progressPercent.textContent = `${percent}%`;
};

const sendUpdate = async (taskId, value) => {
  if (!currentDateKey) {
    return false;
  }
  try {
    const response = await fetch(
      withProfile(`/api/daily/${currentDateKey}/${taskId}`),
      {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Failed to update task:", error);
    return false;
  }
};

const setTaskStatus = (taskId, text, type = "saved") => {
  const status = document.querySelector(
    `.task-status[data-task-id="${taskId}"]`
  );
  if (!status) {
    return;
  }
  status.textContent = text;
  status.classList.remove("saved", "error");
  if (type === "saved") {
    status.classList.add("saved");
  } else if (type === "error") {
    status.classList.add("error");
  }
  const existingTimer = statusTimers.get(taskId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  if (type === "saved") {
    const timer = setTimeout(() => {
      status.textContent = "";
      status.classList.remove("saved", "error");
      statusTimers.delete(taskId);
    }, 2000);
    statusTimers.set(taskId, timer);
  }
};

const wireTaskChecks = () => {
  taskChecks = Array.from(document.querySelectorAll(".task-check"));
  taskChecks.forEach((check) => {
    const item = check.closest(".task-item");
    const taskId = check.dataset.taskId;
    const toggle = () => {
      if (item) {
        item.classList.toggle("completed", check.checked);
      }
      updateProgress();
    };
    check.addEventListener("change", async () => {
      toggle();
      const ok = await sendUpdate(taskId, check.checked);
      if (!ok) {
        setTaskStatus(taskId, "Save failed", "error");
      }
    });
    toggle();
  });
  updateProgress();
};

const wireValueInputs = () => {
  const valueInputs = Array.from(document.querySelectorAll(".task-value"));
  valueInputs.forEach((input) => {
    const taskId = input.dataset.taskId;
    const valueType = input.dataset.valueType;
    const sendValue = async () => {
      setTaskStatus(taskId, "Saving...");
      let value = input.value;
      if (valueType === "number") {
        value = value === "" ? null : Number(value);
      }
      const ok = await sendUpdate(taskId, value);
      if (ok) {
        setTaskStatus(taskId, "Saved", "saved");
      } else {
        setTaskStatus(taskId, "Save failed", "error");
      }
    };
    input.addEventListener("change", sendValue);
    input.addEventListener("blur", sendValue);
  });
};

const renderTasks = (groups) => {
  taskGroups.innerHTML = "";
  if (!groups || !groups.length) {
    taskGroups.className = "text-muted small";
    taskGroups.textContent = "No tasks yet.";
    taskChecks = [];
    updateProgress();
    return;
  }

  groups.forEach((group) => {
    const wrapper = document.createElement("div");
    wrapper.className = "task-group";

    const title = document.createElement("div");
    title.className = "task-group-title";
    title.textContent = group.title;
    wrapper.appendChild(title);

    const list = document.createElement("ul");
    list.className = "task-list";

    (group.tasks || []).forEach((task) => {
      const taskId = task.taskId || task.id;
      const item = document.createElement("li");
      item.className = "task-item";

      if (task.valueType === "bool") {
        const control = document.createElement("div");
        control.className = "custom-control custom-checkbox";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "custom-control-input task-check";
        input.id = `task-${taskId}`;
        input.checked = Boolean(task.value);
        input.dataset.taskId = taskId;

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
          input.value = task.value === null || task.value === undefined ? "" : task.value;
          input.dataset.taskId = taskId;
          input.dataset.valueType = "number";
          row.appendChild(input);
        } else {
          const input = document.createElement("textarea");
          input.className = "form-control form-control-sm task-value task-textarea";
          input.rows = 2;
          input.value = task.value || "";
          input.dataset.taskId = taskId;
          input.dataset.valueType = "string";
          row.appendChild(input);
        }

        const status = document.createElement("span");
        status.className = "task-status";
        status.dataset.taskId = taskId;
        row.appendChild(status);

        item.appendChild(row);
      }

      list.appendChild(item);
    });

    wrapper.appendChild(list);
    taskGroups.appendChild(wrapper);
  });

  wireTaskChecks();
  wireValueInputs();
};

const loadDaily = async (dateKeyOverride = null) => {
  try {
    const params = new URLSearchParams(window.location.search);
    const dateParam = dateKeyOverride || params.get("date");
    const url = dateParam
      ? withProfile(`/api/daily?date=${encodeURIComponent(dateParam)}`)
      : withProfile("/api/daily");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load daily tasks.");
    }
    const payload = await response.json();
    const dateValue = payload.date ? new Date(payload.date) : new Date();
    currentDateKey = payload.dateKey || null;
    currentDateValue = dateValue;
    if (dateLabel) {
      dateLabel.textContent = dateParam ? "Date" : "Today";
    }
    if (todayDate) {
      todayDate.textContent = dateValue.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    if (datePicker) {
      datePicker.value = currentDateKey || "";
    }
    renderTasks(payload.groups || []);
  } catch (error) {
    taskGroups.className = "text-muted small";
    taskGroups.textContent = "Unable to load tasks.";
    if (todayDate) {
      todayDate.textContent = "Unavailable";
    }
    taskChecks = [];
    updateProgress();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  waitForProfile().then(() => {
    loadDaily();
  });
  if (datePicker) {
    datePicker.addEventListener("change", () => {
      const date = parseDateKey(datePicker.value);
      if (!date) {
        return;
      }
      const dateKey = toDateKey(date);
      updateUrlDate(dateKey);
      loadDaily(dateKey);
    });
  }
});
