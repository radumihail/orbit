const profileSelect = document.getElementById("profileSelect");
const newProfileButton = document.getElementById("newProfileButton");
const ACTIVE_PROFILE_KEY = "activeProfileId";

const getActiveProfileId = () => {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || "default";
};

const setActiveProfileId = (profileId) => {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
};

const withProfile = (url) => {
  const profileId = getActiveProfileId();
  if (!profileId) {
    return url;
  }
  const resolved = new URL(url, window.location.origin);
  resolved.searchParams.set("profileId", profileId);
  return `${resolved.pathname}${resolved.search}`;
};

const renderProfiles = (profiles) => {
  if (!profileSelect) {
    return;
  }
  profileSelect.innerHTML = "";
  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.profileId;
    option.textContent = profile.name;
    profileSelect.appendChild(option);
  });
  const active = getActiveProfileId();
  if (profiles.some((profile) => profile.profileId === active)) {
    profileSelect.value = active;
  } else if (profiles.length) {
    profileSelect.value = profiles[0].profileId;
    setActiveProfileId(profileSelect.value);
  }
};

const loadProfiles = async () => {
  try {
    const response = await fetch("/api/profiles");
    if (!response.ok) {
      throw new Error("Failed to load profiles.");
    }
    const payload = await response.json();
    renderProfiles(payload.profiles || []);
  } catch (error) {
    console.error("Profile load failed:", error);
  }
};

const profileReady = loadProfiles();

if (profileSelect) {
  profileSelect.addEventListener("change", () => {
    setActiveProfileId(profileSelect.value);
    window.location.reload();
  });
}

if (newProfileButton) {
  newProfileButton.addEventListener("click", async () => {
    const name = window.prompt("Profile name:");
    if (!name) {
      return;
    }
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to create profile.");
      }
      const payload = await response.json();
      if (payload.profile) {
        setActiveProfileId(payload.profile.profileId);
        window.location.reload();
      }
    } catch (error) {
      window.alert(error.message || "Failed to create profile.");
    }
  });
}

window.profile = {
  getActiveProfileId,
  setActiveProfileId,
  withProfile,
  ready: profileReady,
};
