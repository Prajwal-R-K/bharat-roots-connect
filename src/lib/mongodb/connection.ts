import { MongoClient, Db } from 'mongodb';

// MongoDB connection configuration
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'bhandan';

let client: MongoClient | null = null;
let db: Db | null = null;

// Connect to MongoDB
export const connectToMongoDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(DATABASE_NAME);
    console.log('Connected to MongoDB successfully!');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    console.warn('MongoDB unavailable, using fallback storage');
    throw error;
  }
};

// Get database instance
export const getDatabase = async (): Promise<Db> => {
  if (!db) {
    return await connectToMongoDB();
  }
  return db;
};

// Close MongoDB connection
export const closeMongoDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closeMongoDB();
  process.exit(0);
});