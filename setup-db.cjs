// MongoDB Setup Script for Bharat Roots Connect Chat System
// Run this script to initialize your MongoDB database

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'bhandan';

async function setupDatabase() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    console.log('✅ Connected to MongoDB successfully!');
    
    const db = client.db(DB_NAME);
    
    // Create collections if they don't exist
    console.log('📁 Creating collections...');
    
    // Messages collection
    const messagesCollection = db.collection('messages');
    await messagesCollection.createIndex({ familyTreeId: 1, timestamp: -1 });
    await messagesCollection.createIndex({ senderId: 1 });
    console.log('✅ Messages collection configured');
    
    // Chat rooms collection
    const chatRoomsCollection = db.collection('chatrooms');
    await chatRoomsCollection.createIndex({ familyTreeId: 1 }, { unique: true });
    console.log('✅ Chat rooms collection configured');
    
    console.log('🎉 Database setup completed successfully!');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log('📝 Collections: messages, chatrooms');
    console.log('🔍 Indexes created for optimal performance');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MongoDB is running on localhost:27017');
    console.log('2. Check if MongoDB service is started');
    console.log('3. Verify MongoDB installation');
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the setup
setupDatabase();
