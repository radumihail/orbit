const normalizeProfileId = (profileId) => {
  if (!profileId) {
    return "default";
  }
  return String(profileId);
};

const profileFilter = (profileId) => {
  const normalized = normalizeProfileId(profileId);
  if (normalized === "default") {
    return {
      $or: [{ profileId: "default" }, { profileId: { $exists: false } }],
    };
  }
  return { profileId: normalized };
};

const getProfileIdFromRequest = (request) => {
  return normalizeProfileId(
    request.query?.profileId || request.headers["x-profile-id"]
  );
};

module.exports = {
  getProfileIdFromRequest,
  normalizeProfileId,
  profileFilter,
};
