// Shared types and logic for family events

export interface FamilyEvent {
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
}

// You can add shared functions here, e.g., API calls, event utilities

export const getRSVPCounts = (attendees: FamilyEvent['attendees']) => {
  const counts = { attending: 0, maybe: 0, not_attending: 0 };
  Object.values(attendees).forEach(attendee => {
    counts[attendee.status]++;
  });
  return counts;
};
