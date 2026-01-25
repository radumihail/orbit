const fastify = require("fastify")({ logger: true });
const { connectMongo, closeMongo } = require("./db/mongo");
const dailyRoutes = require("./routes/daily");
const weeklyRoutes = require("./routes/weekly");
const monthlyRoutes = require("./routes/monthly");
const yearlyRoutes = require("./routes/yearly");
const tasksRoutes = require("./routes/tasks");
const staticRoutes = require("./routes/static");

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const start = async () => {
  const collections = await connectMongo();
  fastify.decorate("collections", collections);

  fastify.register(dailyRoutes);
  fastify.register(weeklyRoutes);
  fastify.register(monthlyRoutes);
  fastify.register(yearlyRoutes);
  fastify.register(tasksRoutes);
  fastify.register(staticRoutes);

  fastify.addHook("onClose", async () => {
    await closeMongo();
  });

  await fastify.listen({ port, host });
};

module.exports = { start };
