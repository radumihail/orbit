module.exports = async function registerTemplatesRoutes(fastify) {
  fastify.get("/api/templates", async () => {
    const templates = await fastify.collections.templatesCollection
      .find({})
      .sort({ group: 1, title: 1 })
      .toArray();
    return { templates };
  });
};
