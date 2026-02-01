const { MongoClient } = require("mongodb");
const { buildSeedTasks } = require("../lib/tasks");

const mongoUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGODB_DB || "tasks";
const mongoTasksCollectionName =
  process.env.MONGODB_TASKS_COLLECTION || "tasks";
const mongoDailyCollectionName =
  process.env.MONGODB_DAILY_COLLECTION || "daily_entries";
const mongoProfilesCollectionName =
  process.env.MONGODB_PROFILES_COLLECTION || "profiles";
const mongoTemplatesCollectionName =
  process.env.MONGODB_TEMPLATES_COLLECTION || "task_templates";

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

const ensureDefaultProfile = async (profilesCollection) => {
  const existing = await profilesCollection.findOne({ profileId: "default" });
  if (existing) {
    return;
  }
  const nowIso = new Date().toISOString();
  await profilesCollection.insertOne({
    profileId: "default",
    name: "Default",
    createdAt: nowIso,
    updatedAt: nowIso,
  });
};

const ensureSeedTemplates = async (templatesCollection) => {
  const count = await templatesCollection.countDocuments();
  if (count > 0) {
    return;
  }
  const nowIso = new Date().toISOString();
  const seedTemplates = buildSeedTasks(new Date()).map((task) => {
    const { taskId, ...rest } = task;
    return {
      templateId: taskId,
      ...rest,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
  await templatesCollection.insertMany(seedTemplates);
};

const connectMongo = async () => {
  if (collections) {
    return collections;
  }

  await mongoClient.connect();
  const db = mongoClient.db(mongoDbName);
  const tasksCollection = db.collection(mongoTasksCollectionName);
  const dailyEntriesCollection = db.collection(mongoDailyCollectionName);
  const profilesCollection = db.collection(mongoProfilesCollectionName);
  const templatesCollection = db.collection(mongoTemplatesCollectionName);

  collections = {
    tasksCollection,
    dailyEntriesCollection,
    profilesCollection,
    templatesCollection,
  };
  await ensureDefaultProfile(profilesCollection);
  await ensureSeedTemplates(templatesCollection);
  return collections;
};

const closeMongo = async () => {
  await mongoClient.close();
  collections = null;
};

module.exports = { connectMongo, closeMongo };
