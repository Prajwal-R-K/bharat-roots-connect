// src/lib/neo4j/events.ts
import { runQuery } from './connection';

export interface FamilyEvent {
  id: string;
  title: string;
  description: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  hostId: string;
  hostName: string;
  hostProfilePicture?: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
  attendees: Record<string, {
    status: 'attending' | 'maybe' | 'not_attending';
    name: string;
    profilePicture?: string;
    votedAt: string;
  }>;
}

export const getFamilyEvents = async (familyId: string): Promise<FamilyEvent[]> => {
  const cypher = `
    MATCH (e:FamilyEvent {familyId: $familyId})
    RETURN e
    ORDER BY e.date DESC, e.time DESC
  `;
  const result = await runQuery(cypher, { familyId });
  return result.map((r: any) => {
    const props = r.e.properties;
    return {
      ...props,
      date: new Date(props.date),
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
      attendees: props.attendees ? JSON.parse(props.attendees) : {}
    };
  });
};

export const createFamilyEvent = async (event: FamilyEvent): Promise<FamilyEvent> => {
  const cypher = `
    CREATE (e:FamilyEvent $event)
    RETURN e
  `;
  // Serialize attendees and dates
  const eventToSave = {
    ...event,
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
    updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
    attendees: JSON.stringify(event.attendees || {})
  };
  const result = await runQuery(cypher, { event: eventToSave });
  const props = result[0].e.properties;
  return {
    ...props,
    date: new Date(props.date),
    createdAt: new Date(props.createdAt),
    updatedAt: new Date(props.updatedAt),
    attendees: props.attendees ? JSON.parse(props.attendees) : {}
  };
};

export const updateFamilyEvent = async (event: FamilyEvent): Promise<FamilyEvent> => {
  const cypher = `
    MATCH (e:FamilyEvent {id: $id})
    SET e += $event
    RETURN e
  `;
  const eventToSave = {
    ...event,
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
    updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
    attendees: JSON.stringify(event.attendees || {})
  };
  const result = await runQuery(cypher, { id: event.id, event: eventToSave });
  const props = result[0].e.properties;
  return {
    ...props,
    date: new Date(props.date),
    createdAt: new Date(props.createdAt),
    updatedAt: new Date(props.updatedAt),
    attendees: props.attendees ? JSON.parse(props.attendees) : {}
  };
};

export const deleteFamilyEvent = async (id: string): Promise<void> => {
  const cypher = `
    MATCH (e:FamilyEvent {id: $id})
    DELETE e
  `;
  await runQuery(cypher, { id });
};
