const { normalizeProfileId } = require("../lib/profile");

const slugify = (value) => {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "profile";
};

const generateProfileId = (name) => {
  const slug = slugify(name);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug}-${stamp}${rand}`;
};

module.exports = async function registerProfilesRoutes(fastify) {
  fastify.get("/api/profiles", async () => {
    const profiles = await fastify.collections.profilesCollection
      .find({})
      .sort({ createdAt: 1 })
      .toArray();
    return { profiles };
  });

  fastify.post("/api/profiles", async (request, reply) => {
    const payload = request.body || {};
    const name = String(payload.name || "").trim();
    if (!name) {
      return reply.code(400).send({ error: "Profile name is required." });
    }

    const nowIso = new Date().toISOString();
    const profile = {
      profileId: normalizeProfileId(generateProfileId(name)),
      name,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await fastify.collections.profilesCollection.insertOne(profile);
    return { ok: true, profile };
  });
};
