# Family Chat System - Setup Guide

This guide will help you set up the family chat system for Bharat Roots Connect.

## Prerequisites

1. **MongoDB** - Install MongoDB Community Edition
   - Download from: https://www.mongodb.com/try/download/community
   - Install and start the MongoDB service
   - Default port: 27017

2. **Node.js** - Ensure Node.js is installed (v16 or higher)

## Setup Instructions

### 1. Install Dependencies

The required dependencies are already included in package.json. If you need to install them separately:

```bash
npm install mongodb socket.io-client express socket.io cors
npm install --save-dev @types/express @types/cors @types/socket.io-client
```

### 2. Start MongoDB

**Windows:**
```bash
# Start MongoDB service
net start MongoDB
```

**macOS/Linux:**
```bash
# Start MongoDB service
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 3. Initialize Database

Run the setup script to create the database and collections:

```bash
# This will create the 'bhandan' database with proper collections and indexes
npx ts-node src/lib/setup-mongodb.ts
```

### 4. Start the Chat Server (Optional - for real-time features)

For real-time chat functionality, start the Socket.IO server:

```bash
# Start the chat server on port 3001
npx ts-node server/chat-server.ts
```

### 5. Start the Main Application

```bash
npm run dev
```

## How to Use the Chat System

### 1. Access Chat from Dashboard

- **Navbar Button**: Click the "Chat" button in the top navigation bar
- **Floating Button**: Use the blue floating chat button in the bottom-right corner
- **Sidebar**: Navigate to "Messages" from the sidebar

### 2. Access Dedicated Chat Page

Navigate to `/messages` for a full-screen chat experience.

### 3. Chat Features

- **Real-time messaging**: Send and receive messages instantly
- **Family-only visibility**: Only family members can see the messages
- **Message timestamps**: All messages show when they were sent
- **Professional layout**: Clean, modern chat interface
- **Message history**: Previous messages are loaded automatically
- **Responsive design**: Works on desktop and mobile

## Database Structure

### Collections

1. **messages**
   - `messageId`: Unique identifier for each message
   - `familyTreeId`: Links messages to specific family
   - `senderId`: User ID of the sender
   - `senderName`: Display name of the sender
   - `message`: The actual message content
   - `timestamp`: When the message was sent
   - `messageType`: Type of message (text, image, file)

2. **chatrooms**
   - `familyTreeId`: Unique identifier for the family
   - `members`: Array of user IDs who can access the chat
   - `createdAt`: When the chat room was created
   - `lastMessage`: Reference to the most recent message

### Indexes

- `familyTreeId + timestamp` (for efficient message retrieval)
- `senderId` (for user-specific queries)
- `familyTreeId` (unique for chat rooms)

## Security Features

- **Family-only access**: Messages are only visible to family members
- **User authentication**: Only logged-in users can send messages
- **Data validation**: All messages are validated before saving
- **No cross-family leakage**: Strict family tree ID filtering

## Troubleshooting

### MongoDB Connection Issues

1. **Check if MongoDB is running:**
   ```bash
   # Windows
   tasklist /FI "IMAGENAME eq mongod.exe"
   
   # macOS/Linux
   ps aux | grep mongod
   ```

2. **Test MongoDB connection:**
   ```bash
   mongosh --host localhost --port 27017
   ```

3. **Check MongoDB logs:**
   - Windows: `C:\Program Files\MongoDB\Server\[version]\log\mongod.log`
   - macOS/Linux: `/var/log/mongodb/mongod.log`

### Application Issues

1. **Clear browser cache and localStorage**
2. **Check console for error messages**
3. **Ensure all dependencies are installed**
4. **Verify MongoDB is accessible**

### Port Conflicts

- Main app: `5173` (Vite dev server)
- Chat server: `3001` (Socket.IO server)
- MongoDB: `27017` (MongoDB server)

## Advanced Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=bhandan
CHAT_SERVER_PORT=3001
VITE_CHAT_SERVER_URL=http://localhost:3001
```

### Production Deployment

For production deployment:

1. Use MongoDB Atlas or a proper MongoDB cluster
2. Deploy the chat server to a cloud service
3. Configure proper CORS settings
4. Set up SSL/TLS encryption
5. Implement rate limiting and message moderation

## Features in Development

- [ ] File and image sharing
- [ ] Message reactions (like, love, etc.)
- [ ] Message editing and deletion
- [ ] Typing indicators
- [ ] Online/offline status
- [ ] Message search functionality
- [ ] Chat notifications
- [ ] Voice messages
- [ ] Video calls (future enhancement)

## Support

If you encounter any issues:

1. Check the console for error messages
2. Verify MongoDB is running and accessible
3. Ensure all family members are properly loaded
4. Try refreshing the application

For technical support, check the application logs and database connection status.
