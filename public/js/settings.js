const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const taskStatus = document.getElementById("taskStatus");
const editForm = document.getElementById("taskEditForm");
const editMessage = document.getElementById("editMessage");
const deleteButton = document.getElementById("deleteTask");
const deleteHistoryToggle = document.getElementById("deleteHistory");
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const deleteConfirmInput = document.getElementById("deleteConfirmInput");
const deleteModalError = document.getElementById("deleteModalError");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");

const editTaskId = document.getElementById("editTaskId");
const editTitle = document.getElementById("editTitle");
const editGroup = document.getElementById("editGroup");
const editMeta = document.getElementById("editMeta");
const editValueType = document.getElementById("editValueType");
const editSortOrder = document.getElementById("editSortOrder");
const editRecurrenceType = document.getElementById("editRecurrenceType");
const editWeeklySection = document.getElementById("editWeeklySection");
const editIntervalSection = document.getElementById("editIntervalSection");
const editStartDate = document.getElementById("editStartDate");
const editEndDate = document.getElementById("editEndDate");
const editActive = document.getElementById("editActive");

const createForm = document.getElementById("taskCreateForm");
const createTitle = document.getElementById("taskTitle");
const createGroup = document.getElementById("taskGroup");
const createMeta = document.getElementById("taskMeta");
const createValueType = document.getElementById("taskValueType");
const createRecurrenceType = document.getElementById("taskRecurrenceType");
const createWeeklySection = document.getElementById("weeklySection");
const createIntervalSection = document.getElementById("intervalSection");
const createStartDate = document.getElementById("taskStartDate");
const createEndDate = document.getElementById("taskEndDate");
const createMessage = document.getElementById("taskFormMessage");
const newTaskButton = document.getElementById("newTaskButton");
const toggleCreatePanel = document.getElementById("toggleCreatePanel");
const createPanel = document.getElementById("createPanel");

let tasks = [];
let selectedTaskId = null;
let pendingDeleteHistory = false;

const setMessage = (text, isError = false) => {
  if (!editMessage) {
    return;
  }
  editMessage.textContent = text;
  editMessage.style.color = isError ? "#b42318" : "";
};

const openDeleteModal = (deleteHistory) => {
  if (!deleteModal) {
    return;
  }
  pendingDeleteHistory = deleteHistory;
  const phrase = deleteHistory ? "DELETE HISTORY" : "DELETE";
  deleteModalText.textContent = deleteHistory
    ? `Type "${phrase}" to delete this template and all historical entries.`
    : `Type "${phrase}" to delete this template (history will be kept).`;
  deleteConfirmInput.value = "";
  deleteModalError.textContent = "";
  deleteModal.classList.add("active");
  deleteModal.setAttribute("aria-hidden", "false");
  setTimeout(() => deleteConfirmInput.focus(), 0);
};

const closeDeleteModal = () => {
  if (!deleteModal) {
    return;
  }
  deleteModal.classList.remove("active");
  deleteModal.setAttribute("aria-hidden", "true");
  deleteModalError.textContent = "";
};

const performDelete = async () => {
  const query = pendingDeleteHistory ? "?deleteHistory=true" : "";
  const response = await fetch(`/api/tasks/${selectedTaskId}${query}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Failed to delete task.");
  }
};

const updateRecurrenceVisibility = () => {
  const type = editRecurrenceType.value;
  editWeeklySection.classList.toggle("active", type === "weekly");
  editIntervalSection.classList.toggle("active", type === "interval");
};

const updateCreateRecurrenceVisibility = () => {
  if (!createRecurrenceType) {
    return;
  }
  const type = createRecurrenceType.value;
  createWeeklySection.classList.toggle("active", type === "weekly");
  createIntervalSection.classList.toggle("active", type === "interval");
};

const setCreatePanelOpen = (open) => {
  if (!createPanel || !toggleCreatePanel) {
    return;
  }
  createPanel.classList.toggle("active", open);
  toggleCreatePanel.setAttribute("aria-expanded", open ? "true" : "false");
  const label = toggleCreatePanel.querySelector("span:last-child");
  if (label) {
    label.textContent = open ? "Hide" : "Show";
  }
};

const setFormEnabled = (enabled) => {
  Array.from(editForm.elements).forEach((element) => {
    if (element.tagName === "BUTTON") {
      element.disabled = !enabled;
      return;
    }
    if (element.id === "editTaskId") {
      return;
    }
    element.disabled = !enabled;
  });
};

const buildRecurrenceSummary = (task) => {
  if (!task.recurrence) {
    return "No recurrence";
  }
  if (task.recurrence.type === "weekly") {
    const days = Array.isArray(task.recurrence.daysOfWeek)
      ? task.recurrence.daysOfWeek
      : [];
    if (!days.length) {
      return "Weekly";
    }
    return `Weekly · ${days.length} day${days.length > 1 ? "s" : ""}`;
  }
  if (task.recurrence.type === "interval") {
    const start = task.recurrence.startDate || "";
    const end = task.recurrence.endDate || "open";
    return `Interval · ${start} → ${end}`;
  }
  return "Custom";
};

const renderList = () => {
  taskList.innerHTML = "";
  taskCount.textContent = `${tasks.length} total`;
  if (!tasks.length) {
    taskList.innerHTML = '<div class="text-muted small">No tasks yet.</div>';
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "settings-item";
    if (task.taskId === selectedTaskId) {
      item.classList.add("active");
    }
    item.dataset.taskId = task.taskId;

    const title = document.createElement("div");
    title.className = "settings-item-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "settings-item-meta";
    meta.textContent = `${task.group || "General"} · ${buildRecurrenceSummary(task)}`;

    item.appendChild(title);
    item.appendChild(meta);
    item.addEventListener("click", () => selectTask(task.taskId));

    taskList.appendChild(item);
  });
};

const selectTask = (taskId) => {
  const task = tasks.find((item) => item.taskId === taskId);
  if (!task) {
    return;
  }
  selectedTaskId = taskId;
  taskStatus.textContent = task.active === false ? "Archived" : "Active";
  editTaskId.value = task.taskId;
  editTitle.value = task.title || "";
  editGroup.value = task.group || "";
  editMeta.value = task.meta || "";
  editValueType.value = task.valueType || "bool";
  editSortOrder.value =
    task.sortOrder === undefined || task.sortOrder === null ? "" : task.sortOrder;
  editActive.value = task.active === false ? "false" : "true";

  if (task.recurrence && task.recurrence.type === "interval") {
    editRecurrenceType.value = "interval";
    editStartDate.value = task.recurrence.startDate || "";
    editEndDate.value = task.recurrence.endDate || "";
  } else {
    editRecurrenceType.value = "weekly";
    const days = Array.isArray(task.recurrence?.daysOfWeek)
      ? task.recurrence.daysOfWeek
      : [];
    editWeeklySection
      .querySelectorAll("input[type='checkbox']")
      .forEach((input) => {
        input.checked = days.includes(Number(input.value));
      });
  }

  updateRecurrenceVisibility();
  setFormEnabled(true);
  setMessage("");
  renderList();
};

const loadTasks = async () => {
  try {
    const response = await fetch("/api/tasks");
    if (!response.ok) {
      throw new Error("Failed to load tasks.");
    }
    const payload = await response.json();
    tasks = payload.tasks || [];
    if (tasks.length && !selectedTaskId) {
      selectedTaskId = tasks[0].taskId;
    }
    renderList();
    if (selectedTaskId) {
      selectTask(selectedTaskId);
    } else {
      setFormEnabled(false);
      taskStatus.textContent = "No task selected";
    }
  } catch (error) {
    taskList.innerHTML = '<div class="text-muted small">Unable to load tasks.</div>';
    taskCount.textContent = "Unavailable";
    setFormEnabled(false);
  }
};

editRecurrenceType.addEventListener("change", updateRecurrenceVisibility);
updateRecurrenceVisibility();
setFormEnabled(false);

if (createRecurrenceType) {
  createRecurrenceType.addEventListener(
    "change",
    updateCreateRecurrenceVisibility
  );
  updateCreateRecurrenceVisibility();
}

if (toggleCreatePanel) {
  toggleCreatePanel.addEventListener("click", () => {
    const isOpen = toggleCreatePanel.getAttribute("aria-expanded") === "true";
    setCreatePanelOpen(!isOpen);
  });
  setCreatePanelOpen(false);
}

if (newTaskButton) {
  newTaskButton.addEventListener("click", () => {
    setCreatePanelOpen(true);
    if (createTitle) {
      createTitle.focus();
    }
    if (createPanel) {
      createPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedTaskId) {
    setMessage("Select a task to edit.", true);
    return;
  }

  const title = editTitle.value.trim();
  if (!title) {
    setMessage("Title is required.", true);
    return;
  }

  const payload = {
    title,
    group: editGroup.value.trim(),
    meta: editMeta.value.trim(),
    valueType: editValueType.value,
    active: editActive.value === "true",
  };

  if (editSortOrder.value !== "") {
    payload.sortOrder = Number(editSortOrder.value);
  }

  if (editRecurrenceType.value === "weekly") {
    const dayInputs = editWeeklySection.querySelectorAll(
      "input[type='checkbox']:checked"
    );
    const daysOfWeek = Array.from(dayInputs).map((input) =>
      Number(input.value)
    );
    if (!daysOfWeek.length) {
      setMessage("Select at least one weekday.", true);
      return;
    }
    payload.recurrence = { type: "weekly", daysOfWeek };
  } else {
    const startDate = editStartDate.value;
    if (!startDate) {
      setMessage("Start date is required.", true);
      return;
    }
    payload.recurrence = { type: "interval", startDate };
    if (editEndDate.value) {
      payload.recurrence.endDate = editEndDate.value;
    } else {
      payload.recurrence.endDate = null;
    }
  }

  try {
    setMessage("Saving...");
    const response = await fetch(`/api/tasks/${selectedTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "Failed to save task.");
    }

    const { task } = await response.json();
    tasks = tasks.map((item) => (item.taskId === task.taskId ? task : item));
    setMessage("Changes saved.");
    selectTask(task.taskId);
  } catch (error) {
    setMessage(error.message || "Failed to save task.", true);
  }
});

if (createForm) {
  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!createTitle.value.trim()) {
      if (createMessage) {
        createMessage.textContent = "Title is required.";
      }
      return;
    }

    const payload = {
      title: createTitle.value.trim(),
      group: createGroup.value.trim(),
      meta: createMeta.value.trim(),
      valueType: createValueType.value,
      recurrence: {
        type: createRecurrenceType.value,
      },
    };

    if (payload.recurrence.type === "weekly") {
      const dayInputs = createWeeklySection.querySelectorAll(
        "input[type='checkbox']:checked"
      );
      const daysOfWeek = Array.from(dayInputs).map((input) =>
        Number(input.value)
      );
      if (!daysOfWeek.length) {
        if (createMessage) {
          createMessage.textContent = "Select at least one weekday.";
        }
        return;
      }
      payload.recurrence.daysOfWeek = daysOfWeek;
    } else {
      const startDate = createStartDate.value;
      if (!startDate) {
        if (createMessage) {
          createMessage.textContent = "Start date is required.";
        }
        return;
      }
      payload.recurrence.startDate = startDate;
      if (createEndDate.value) {
        payload.recurrence.endDate = createEndDate.value;
      }
    }

    try {
      if (createMessage) {
        createMessage.textContent = "Saving...";
      }
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

      const data = await response.json();
      tasks = [...tasks, data.task].sort((a, b) => {
        if (a.group === b.group) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return String(a.group || "").localeCompare(String(b.group || ""));
      });
      if (!selectedTaskId) {
        selectedTaskId = data.task.taskId;
      }
      renderList();
      if (selectedTaskId) {
        selectTask(selectedTaskId);
      }
      createForm.reset();
      updateCreateRecurrenceVisibility();
      setCreatePanelOpen(false);
      if (createMessage) {
        createMessage.textContent = "Task added.";
      }
    } catch (error) {
      if (createMessage) {
        createMessage.textContent = error.message || "Failed to create task.";
      }
    }
  });
}

if (deleteButton) {
  deleteButton.addEventListener("click", async () => {
    if (!selectedTaskId) {
      setMessage("Select a task to delete.", true);
      return;
    }
    const deleteHistory = deleteHistoryToggle && deleteHistoryToggle.checked;
    openDeleteModal(deleteHistory);
  });
}

if (deleteConfirm) {
  deleteConfirm.addEventListener("click", async () => {
    const phrase = pendingDeleteHistory ? "DELETE HISTORY" : "DELETE";
    if (deleteConfirmInput.value.trim() !== phrase) {
      deleteModalError.textContent = `Please type "${phrase}" to confirm.`;
      return;
    }

    try {
      setMessage("Deleting...");
      await performDelete();
      closeDeleteModal();
      tasks = tasks.filter((item) => item.taskId !== selectedTaskId);
      selectedTaskId = tasks.length ? tasks[0].taskId : null;
      setMessage("Task deleted.");
      renderList();
      if (selectedTaskId) {
        selectTask(selectedTaskId);
      } else {
        setFormEnabled(false);
        taskStatus.textContent = "No task selected";
      }
    } catch (error) {
      deleteModalError.textContent = error.message || "Failed to delete task.";
      setMessage(error.message || "Failed to delete task.", true);
    }
  });
}

if (deleteCancel) {
  deleteCancel.addEventListener("click", () => {
    closeDeleteModal();
    setMessage("Delete cancelled.");
  });
}

if (deleteModal) {
  deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDeleteModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
});
