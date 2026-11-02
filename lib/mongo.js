import { MongoClient } from 'mongodb';

const globalForMongo = globalThis;

export async function getMongoDb() {
  if (!process.env.MONGODB_URI) throw new Error('Missing environment variable MONGODB_URI');
  if (!globalForMongo._gridMongo) {
    globalForMongo._gridMongo = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    }).connect();
  }
  const client = await globalForMongo._gridMongo;
  return client.db(process.env.MONGODB_DB || 'smart_grid_telemetry');
}
