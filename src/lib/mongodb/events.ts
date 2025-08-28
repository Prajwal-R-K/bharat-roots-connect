import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'bharat_roots_connect';

interface FamilyEvent {
  _id?: string;
  id: string;
  title: string;
  description: string;
  eventType: string;
  date: Date;
  time: string;
  location: string;
  hostId: string;
  hostName: string;
  hostProfilePicture?: string;
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
  attendees: {
    [userId: string]: {
      status: 'attending' | 'maybe' | 'not_attending';
      name: string;
      profilePicture?: string;
      votedAt: Date;
    }
  };
  isDeleted: boolean;
}

let client: MongoClient;
let db: Db;
let eventsCollection: Collection<FamilyEvent>;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DATABASE_NAME);
    eventsCollection = db.collection('family_events');
    
    // Create indexes for better performance
    await eventsCollection.createIndex({ familyId: 1, date: 1 });
    await eventsCollection.createIndex({ hostId: 1 });
    await eventsCollection.createIndex({ 'attendees.userId': 1 });
  }
  return { db, eventsCollection };
}

// Create a new family event
export async function createFamilyEvent(eventData: Omit<FamilyEvent, '_id' | 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<FamilyEvent> {
  await connectToDatabase();
  
  const newEvent: FamilyEvent = {
    ...eventData,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };
  
  const result = await eventsCollection.insertOne(newEvent);
  
  if (!result.insertedId) {
    throw new Error('Failed to create event');
  }
  
  return { ...newEvent, _id: result.insertedId.toString() };
}

// Get all events for a family
export async function getFamilyEvents(familyId: string, includeDeleted: boolean = false): Promise<FamilyEvent[]> {
  await connectToDatabase();
  
  const filter: any = { familyId };
  if (!includeDeleted) {
    filter.isDeleted = { $ne: true };
  }
  
  const events = await eventsCollection
    .find(filter)
    .sort({ date: 1 })
    .toArray();
  
  return events.map(event => ({
    ...event,
    _id: event._id?.toString()
  }));
}

// Get upcoming events for a family
export async function getUpcomingFamilyEvents(familyId: string, limit: number = 10): Promise<FamilyEvent[]> {
  await connectToDatabase();
  
  const now = new Date();
  
  const events = await eventsCollection
    .find({
      familyId,
      date: { $gte: now },
      isDeleted: { $ne: true }
    })
    .sort({ date: 1 })
    .limit(limit)
    .toArray();
  
  return events.map(event => ({
    ...event,
    _id: event._id?.toString()
  }));
}

// Get a specific event by ID
export async function getEventById(eventId: string): Promise<FamilyEvent | null> {
  await connectToDatabase();
  
  const event = await eventsCollection.findOne({ 
    id: eventId,
    isDeleted: { $ne: true }
  });
  
  if (!event) return null;
  
  return {
    ...event,
    _id: event._id?.toString()
  };
}

// Update an event
export async function updateFamilyEvent(eventId: string, updates: Partial<FamilyEvent>): Promise<FamilyEvent | null> {
  await connectToDatabase();
  
  const updateData = {
    ...updates,
    updatedAt: new Date()
  };
  
  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.id;
  delete updateData.createdAt;
  
  const result = await eventsCollection.findOneAndUpdate(
    { id: eventId, isDeleted: { $ne: true } },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  
  if (!result.value) return null;
  
  return {
    ...result.value,
    _id: result.value._id?.toString()
  };
}

// Delete an event (soft delete)
export async function deleteFamilyEvent(eventId: string, hostId: string): Promise<boolean> {
  await connectToDatabase();
  
  const result = await eventsCollection.updateOne(
    { id: eventId, hostId, isDeleted: { $ne: true } },
    { 
      $set: { 
        isDeleted: true,
        updatedAt: new Date()
      }
    }
  );
  
  return result.modifiedCount > 0;
}

// Update RSVP for an event
export async function updateEventRSVP(
  eventId: string, 
  userId: string, 
  userName: string,
  userProfilePicture: string | undefined,
  status: 'attending' | 'maybe' | 'not_attending'
): Promise<boolean> {
  await connectToDatabase();
  
  const result = await eventsCollection.updateOne(
    { id: eventId, isDeleted: { $ne: true } },
    { 
      $set: { 
        [`attendees.${userId}`]: {
          status,
          name: userName,
          profilePicture: userProfilePicture,
          votedAt: new Date()
        },
        updatedAt: new Date()
      }
    }
  );
  
  return result.modifiedCount > 0;
}

// Remove RSVP for an event
export async function removeEventRSVP(eventId: string, userId: string): Promise<boolean> {
  await connectToDatabase();
  
  const result = await eventsCollection.updateOne(
    { id: eventId, isDeleted: { $ne: true } },
    { 
      $unset: { [`attendees.${userId}`]: "" },
      $set: { updatedAt: new Date() }
    }
  );
  
  return result.modifiedCount > 0;
}

// Get events where user has RSVP'd
export async function getUserRSVPEvents(userId: string, familyId: string): Promise<FamilyEvent[]> {
  await connectToDatabase();
  
  const events = await eventsCollection
    .find({
      familyId,
      [`attendees.${userId}`]: { $exists: true },
      isDeleted: { $ne: true }
    })
    .sort({ date: 1 })
    .toArray();
  
  return events.map(event => ({
    ...event,
    _id: event._id?.toString()
  }));
}

// Get events hosted by a user
export async function getUserHostedEvents(hostId: string, familyId: string): Promise<FamilyEvent[]> {
  await connectToDatabase();
  
  const events = await eventsCollection
    .find({
      familyId,
      hostId,
      isDeleted: { $ne: true }
    })
    .sort({ date: 1 })
    .toArray();
  
  return events.map(event => ({
    ...event,
    _id: event._id?.toString()
  }));
}

// Get RSVP statistics for an event
export async function getEventRSVPStats(eventId: string): Promise<{
  attending: number;
  maybe: number;
  not_attending: number;
  total: number;
}> {
  await connectToDatabase();
  
  const event = await eventsCollection.findOne({ 
    id: eventId,
    isDeleted: { $ne: true }
  });
  
  if (!event) {
    return { attending: 0, maybe: 0, not_attending: 0, total: 0 };
  }
  
  const stats = { attending: 0, maybe: 0, not_attending: 0, total: 0 };
  
  Object.values(event.attendees || {}).forEach(attendee => {
    stats[attendee.status]++;
    stats.total++;
  });
  
  return stats;
}

// Get events by date range
export async function getEventsByDateRange(
  familyId: string, 
  startDate: Date, 
  endDate: Date
): Promise<FamilyEvent[]> {
  await connectToDatabase();
  
  const events = await eventsCollection
    .find({
      familyId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: { $ne: true }
    })
    .sort({ date: 1 })
    .toArray();
  
  return events.map(event => ({
    ...event,
    _id: event._id?.toString()
  }));
}

export { type FamilyEvent };