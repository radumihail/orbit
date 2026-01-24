const { MongoClient } = require("mongodb");
const { buildSeedTasks } = require("../lib/tasks");

const mongoUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGODB_DB || "tasks";
const mongoTasksCollectionName =
  process.env.MONGODB_TASKS_COLLECTION || "tasks";
const mongoDailyCollectionName =
  process.env.MONGODB_DAILY_COLLECTION || "daily_entries";

const mongoClient = new MongoClient(mongoUrl);
let collections = null;

const ensureSeedTasks = async (tasksCollection) => {
  const count = await tasksCollection.countDocuments();
  if (count > 0) {
    return;
  }
  const seedTasks = buildSeedTasks(new Date());
  await tasksCollection.insertMany(seedTasks);
};

const connectMongo = async () => {
  if (collections) {
    return collections;
  }

  await mongoClient.connect();
  const db = mongoClient.db(mongoDbName);
  const tasksCollection = db.collection(mongoTasksCollectionName);
  const dailyEntriesCollection = db.collection(mongoDailyCollectionName);

  collections = { tasksCollection, dailyEntriesCollection };
  await ensureSeedTasks(tasksCollection);
  return collections;
};

const closeMongo = async () => {
  await mongoClient.close();
  collections = null;
};

module.exports = { connectMongo, closeMongo };
