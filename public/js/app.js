const progressBar = document.getElementById("dailyProgress");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const todayDate = document.getElementById("todayDate");
const taskGroups = document.getElementById("taskGroups");
let taskChecks = [];
let currentDateKey = null;

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
    return;
  }
  try {
    await fetch(`/api/daily/${currentDateKey}/${taskId}`, {
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
    check.addEventListener("change", () => {
      toggle();
      sendUpdate(taskId, check.checked);
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
    const sendValue = () => {
      let value = input.value;
      if (valueType === "number") {
        value = value === "" ? null : Number(value);
      }
      sendUpdate(taskId, value);
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

const loadDaily = async () => {
  try {
    const response = await fetch("/api/daily");
    if (!response.ok) {
      throw new Error("Failed to load daily tasks.");
    }
    const payload = await response.json();
    const dateValue = payload.date ? new Date(payload.date) : new Date();
    currentDateKey = payload.dateKey || null;
    todayDate.textContent = dateValue.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    renderTasks(payload.groups || []);
  } catch (error) {
    taskGroups.className = "text-muted small";
    taskGroups.textContent = "Unable to load tasks.";
    todayDate.textContent = "Unavailable";
    taskChecks = [];
    updateProgress();
  }
};

const setupTaskForm = () => {
  const form = document.getElementById("taskForm");
  if (!form) {
    return;
  }

  const titleInput = document.getElementById("taskTitle");
  const groupInput = document.getElementById("taskGroup");
  const metaInput = document.getElementById("taskMeta");
  const valueTypeInput = document.getElementById("taskValueType");
  const recurrenceSelect = document.getElementById("taskRecurrenceType");
  const weeklySection = document.getElementById("weeklySection");
  const intervalSection = document.getElementById("intervalSection");
  const startDateInput = document.getElementById("taskStartDate");
  const endDateInput = document.getElementById("taskEndDate");
  const message = document.getElementById("taskFormMessage");

  const setMessage = (text, isError = false) => {
    if (!message) {
      return;
    }
    message.textContent = text;
    message.style.color = isError ? "#b42318" : "";
  };

  const updateRecurrenceVisibility = () => {
    const type = recurrenceSelect.value;
    weeklySection.classList.toggle("active", type === "weekly");
    intervalSection.classList.toggle("active", type === "interval");
  };

  recurrenceSelect.addEventListener("change", updateRecurrenceVisibility);
  updateRecurrenceVisibility();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const title = titleInput.value.trim();
    if (!title) {
      setMessage("Title is required.", true);
      return;
    }

    const payload = {
      title,
      group: groupInput.value.trim(),
      meta: metaInput.value.trim(),
      valueType: valueTypeInput.value,
      recurrence: {
        type: recurrenceSelect.value,
      },
    };

    if (payload.recurrence.type === "weekly") {
      const dayInputs = weeklySection.querySelectorAll(
        "input[type='checkbox']:checked"
      );
      const daysOfWeek = Array.from(dayInputs).map((input) =>
        Number(input.value)
      );
      if (!daysOfWeek.length) {
        setMessage("Select at least one weekday.", true);
        return;
      }
      payload.recurrence.daysOfWeek = daysOfWeek;
    } else {
      const startDate = startDateInput.value;
      if (!startDate) {
        setMessage("Start date is required.", true);
        return;
      }
      payload.recurrence.startDate = startDate;
      if (endDateInput.value) {
        payload.recurrence.endDate = endDateInput.value;
      }
    }

    try {
      setMessage("Saving...");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to create task.");
      }

      form.reset();
      updateRecurrenceVisibility();
      setMessage("Task added.");
      loadDaily();
    } catch (error) {
      setMessage(error.message || "Failed to create task.", true);
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  loadDaily();
  setupTaskForm();
});
