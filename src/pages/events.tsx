import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';
import {
  Cake, Heart, Gift, GraduationCap, Home, Users, PartyPopper, Camera, Star,
  Edit3, Trash2, Timer, Clock, Calendar, ArrowLeft, Plus, Sun, Moon, MapPin,
  Crown, UserCheck, UserX
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent
} from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent,
  DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { User } from '../types/index';
import { FamilyEvent } from '../features/family-tree/events';
import { getUserByEmailOrId } from '../lib/neo4j/users';
import { getFamilyMembers } from '../lib/neo4j/family-tree';
import {
  getFamilyEvents, createFamilyEvent, updateFamilyEvent, deleteFamilyEvent
} from '../lib/neo4j/events';
import {
  format, isPast, differenceInDays, differenceInHours, differenceInMinutes,
  isToday, isTomorrow
} from 'date-fns';

// Attendee type for RSVP
interface AttendeeType {
  status: 'attending' | 'maybe' | 'not_attending';
  name: string;
  profilePicture?: string;
  votedAt: Date;
}

const EVENT_TYPES = [
  { id: 'birthday', name: 'Birthday', icon: Cake, color: 'from-pink-500 to-rose-600' },
  { id: 'anniversary', name: 'Anniversary', icon: Heart, color: 'from-red-500 to-pink-600' },
  { id: 'wedding', name: 'Wedding', icon: Gift, color: 'from-purple-500 to-indigo-600' },
  { id: 'graduation', name: 'Graduation', icon: GraduationCap, color: 'from-blue-500 to-cyan-600' },
  { id: 'housewarming', name: 'Housewarming', icon: Home, color: 'from-green-500 to-teal-600' },
  { id: 'reunion', name: 'Family Reunion', icon: Users, color: 'from-orange-500 to-amber-600' },
  { id: 'celebration', name: 'Celebration', icon: PartyPopper, color: 'from-yellow-500 to-orange-600' },
  { id: 'photoshoot', name: 'Photoshoot', icon: Camera, color: 'from-indigo-500 to-purple-600' },
  { id: 'other', name: 'Other', icon: Star, color: 'from-gray-500 to-slate-600' }
];

const EventsPage: React.FC = () => {
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  // Track expanded attendee lists by event ID
  const [showAllAttendees, setShowAllAttendees] = useState<{[eventId: string]: boolean}>({});

  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<User[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);

  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    eventType: string;
    date: string;
    time: string;
    location: string;
  }>({
    title: '',
    description: '',
    eventType: '',
    date: '',
    time: '',
    location: ''
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);

        const storedUserId = localStorage.getItem('userId');
        const storedEmail = localStorage.getItem('userEmail');
        
        if (!storedUserId && !storedEmail) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access family events.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        const currentUser = await getUserByEmailOrId(storedUserId || storedEmail!);
        if (!currentUser || !currentUser.familyTreeId) {
          toast({
            title: "Family Not Found",
            description: "You need to be part of a family to view events.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }

        setUser(currentUser);

        const members = await getFamilyMembers(currentUser.familyTreeId);
        setFamilyMembers(members.map(m => ({
          ...m,
          familyTreeId: currentUser.familyTreeId || ''
        })));

        // Fetch events from backend and convert date fields
        const eventsData = await getFamilyEvents(currentUser.familyTreeId);
        const convertedEvents = eventsData.map(ev => ({
          ...ev,
          date: new Date(ev.date),
          createdAt: new Date(ev.createdAt),
          updatedAt: new Date(ev.updatedAt),
          attendees: Object.fromEntries(
            Object.entries(ev.attendees).map(([uid, att]) => [uid, {
              ...att,
              votedAt: typeof att.votedAt === 'string' ? new Date(att.votedAt) : att.votedAt
            }])
          )
        }));
        setEvents(convertedEvents);
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load family events. Please try again.",
          variant: "destructive"
        });
      }
    };

    initializeData();
  }, [navigate, toast]);

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      eventType: '',
      date: '',
      time: '',
      location: ''
    });
  };

  // Handle create event
  const handleCreateEvent = async () => {
    if (!user || !eventForm.title || !eventForm.date || !eventForm.time) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newEvent: FamilyEvent = {
        id: `event_${Date.now()}`,
        title: eventForm.title,
        description: eventForm.description,
        eventType: eventForm.eventType || 'other',
        date: new Date(eventForm.date),
        time: eventForm.time,
        location: eventForm.location,
        hostId: user.userId,
        hostName: user.name,
        hostProfilePicture: user.profilePicture,
        familyId: user.familyTreeId,
        createdAt: new Date(),
        updatedAt: new Date(),
        attendees: {
          [user.userId]: {
            status: 'attending',
            name: user.name,
            profilePicture: user.profilePicture,
            votedAt: new Date()
          }
        }
      };

      // Save to backend
      const createdRaw = await createFamilyEvent({
        ...newEvent,
        date: newEvent.date instanceof Date ? newEvent.date.toISOString() : newEvent.date,
        createdAt: newEvent.createdAt instanceof Date ? newEvent.createdAt.toISOString() : newEvent.createdAt,
        updatedAt: newEvent.updatedAt instanceof Date ? newEvent.updatedAt.toISOString() : newEvent.updatedAt,
        attendees: Object.fromEntries(
          Object.entries(newEvent.attendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: att.votedAt instanceof Date ? att.votedAt.toISOString() : att.votedAt
          }])
        )
      });
      const created = {
        ...createdRaw,
        date: new Date(createdRaw.date),
        createdAt: new Date(createdRaw.createdAt),
        updatedAt: new Date(createdRaw.updatedAt),
        attendees: Object.fromEntries(
          Object.entries(createdRaw.attendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: new Date(att.votedAt)
          }])
        )
      };
      setEvents(prev => [...prev, created]);
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Your family event has been created successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle edit event
  const handleEditEvent = async () => {
    if (!editingEvent || !eventForm.title || !eventForm.date || !eventForm.time) {
      toast({
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedEvent: FamilyEvent = {
        ...editingEvent,
        title: eventForm.title,
        description: eventForm.description,
        eventType: eventForm.eventType || 'other',
        date: new Date(eventForm.date).toISOString(),
        time: eventForm.time,
        location: eventForm.location,
        updatedAt: new Date().toISOString(),
        attendees: Object.fromEntries(
          Object.entries(editingEvent.attendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: att.votedAt instanceof Date ? att.votedAt.toISOString() : att.votedAt
          }])
        )
      };
      const updatedRaw = await updateFamilyEvent(updatedEvent);
      const updated = {
        ...updatedRaw,
        date: new Date(updatedRaw.date),
        createdAt: new Date(updatedRaw.createdAt),
        updatedAt: new Date(updatedRaw.updatedAt),
        attendees: Object.fromEntries(
          Object.entries(updatedRaw.attendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: new Date(att.votedAt)
          }])
        )
      };
      setEvents(prev => prev.map(event => event.id === updated.id ? updated : event));
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast({
        title: "Success",
        description: "Your event has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteFamilyEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "The event has been removed successfully."
      });
    } catch (error) {
      toast("Failed to delete event. Please try again.");
    }
  };

  // Handle RSVP
  const handleRSVP = async (eventId: string, status: 'attending' | 'maybe' | 'not_attending') => {
    if (!user) return;

    try {
      const eventToUpdate = events.find(e => e.id === eventId);
      if (!eventToUpdate) return;
      const updatedAttendees = {
        ...eventToUpdate.attendees,
        [user.userId]: {
          status,
          name: user.name,
          profilePicture: user.profilePicture,
          votedAt: new Date()
        }
      };
      const updatedEvent = {
        ...eventToUpdate,
        attendees: Object.fromEntries(
          Object.entries(updatedAttendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: att.votedAt instanceof Date ? att.votedAt.toISOString() : att.votedAt
          }])
        ),
        updatedAt: new Date().toISOString(),
        date: eventToUpdate.date instanceof Date ? eventToUpdate.date.toISOString() : eventToUpdate.date
      };
      const updatedRaw = await updateFamilyEvent(updatedEvent);
      const updated = {
        ...updatedRaw,
        date: new Date(updatedRaw.date),
        createdAt: new Date(updatedRaw.createdAt),
        updatedAt: new Date(updatedRaw.updatedAt),
        attendees: Object.fromEntries(
          Object.entries(updatedRaw.attendees).map(([uid, att]) => [uid, {
            ...att,
            votedAt: new Date(att.votedAt)
          }])
        )
      };
      setEvents(prev => prev.map(event => event.id === updated.id ? updated : event));
      toast(`You've marked yourself as ${status.replace('_', ' ')}.`);
    } catch (error) {
      toast("Failed to update RSVP. Please try again.");
    }
  };

  // Open edit dialog
  const openEditDialog = (event: FamilyEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      date: format(event.date, 'yyyy-MM-dd'),
      time: event.time,
      location: event.location
    });
    setIsEditDialogOpen(true);
  };

  // Get time remaining
  const getTimeRemaining = (eventDate: Date, eventTime: string) => {
    const eventDateTime = new Date(eventDate);
    const [hours, minutes] = eventTime.split(':');
    eventDateTime.setHours(parseInt(hours), parseInt(minutes));

    if (isPast(eventDateTime)) {
      return { text: 'Event passed', isPast: true };
    }

    const now = new Date();
    const diffDays = differenceInDays(eventDateTime, now);
    const diffHours = differenceInHours(eventDateTime, now);
    const diffMinutes = differenceInMinutes(eventDateTime, now);

    if (isToday(eventDateTime)) {
      if (diffHours > 0) {
        return { text: `${diffHours}h ${diffMinutes % 60}m remaining`, isPast: false };
      } else {
        return { text: `${diffMinutes}m remaining`, isPast: false };
      }
    } else if (isTomorrow(eventDateTime)) {
      return { text: 'Tomorrow', isPast: false };
    } else if (diffDays > 0) {
      return { text: `${diffDays} days remaining`, isPast: false };
    } else {
      return { text: 'Soon', isPast: false };
    }
  };

  // Get event type info
  const getEventTypeInfo = (eventType: string) => {
    return EVENT_TYPES.find(type => type.id === eventType) || EVENT_TYPES[EVENT_TYPES.length - 1];
  };

  // Get RSVP counts
  const getRSVPCounts = (attendees: FamilyEvent['attendees']) => {
    const counts = { attending: 0, maybe: 0, not_attending: 0 };
    Object.values(attendees).forEach((attendee: AttendeeType) => {
      counts[attendee.status]++;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading Events</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Getting your family events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-300">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full px-3 py-2 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Family Events
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {events.length} event{events.length !== 1 ? 's' : ''} • {user?.familyTreeId}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Create Event Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    Create Family Event
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Mom's Birthday Party"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select value={eventForm.eventType} onValueChange={(value) => setEventForm(prev => ({ ...prev, eventType: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={eventForm.time}
                        onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Family Home, Restaurant Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add details about the event..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateEvent} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      Create Event
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 hover:scale-105 transition-all duration-200"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <div className={`absolute inset-0 bg-gradient-to-r transition-all duration-300 ${
                theme === 'light' 
                  ? 'from-yellow-400 to-orange-500 opacity-10' 
                  : 'from-blue-600 to-purple-700 opacity-20'
              }`} />
              <div className="relative flex items-center gap-2">
                {theme === 'light' ? (
                  <>
                    <Sun className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Dark</span>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No events yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create your first family event to get started!</p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className={`w-full ${events.length === 1 ? 'flex justify-center' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {events.map((event) => {
                const eventTypeInfo = getEventTypeInfo(event.eventType);
                const timeRemaining = getTimeRemaining(event.date, event.time);
                const rsvpCounts = getRSVPCounts(event.attendees);
                const userRSVP = event.attendees[user?.userId || ''];
                const isHost = event.hostId === user?.userId;
                const IconComponent = eventTypeInfo.icon;

                const attendeeEntries: [string, AttendeeType][] = Object.entries(event.attendees) as [string, AttendeeType][];
                const recentAttendee = attendeeEntries.length > 0 ? attendeeEntries.reduce((a, b) => {
                  return new Date(a[1].votedAt) > new Date(b[1].votedAt) ? a : b;
                }) : null;

                return (
                  <Card key={event.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden relative">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${eventTypeInfo.color} rounded-full flex items-center justify-center shadow-lg`}>
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">{event.title}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              {eventTypeInfo.name}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Time Remaining Top Right, spaced from edit/delete */}
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                            timeRemaining.isPast 
                              ? 'bg-gray-100 dark:bg-gray-700' 
                              : 'bg-orange-100 dark:bg-orange-900'
                          }`}>
                            <Timer className={`h-4 w-4 ${
                              timeRemaining.isPast 
                                ? 'text-gray-500' 
                                : 'text-orange-600 dark:text-orange-400'
                            }`} />
                            <span className={`text-xs font-medium ${
                              timeRemaining.isPast 
                                ? 'text-gray-500' 
                                : 'text-orange-700 dark:text-orange-300'
                            }`}>
                              {timeRemaining.text}
                            </span>
                          </div>
                          {isHost && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(event)}
                                className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEvent(event.id)}
                                className="hover:bg-red-100 dark:hover:bg-red-900 text-red-600 rounded-full p-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => setShowAllAttendees(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                          >
                            {showAllAttendees[event.id] ? 'Hide' : 'See All'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Event Details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{format(event.date, 'EEEE, MMMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{event.time}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Host Info */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <Crown className="h-4 w-4 text-blue-600" />
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={event.hostProfilePicture} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs">
                            {event.hostName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Hosted by {isHost ? 'You' : event.hostName}
                        </span>
                      </div>
                      {/* RSVP Buttons */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            variant={userRSVP?.status === 'attending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRSVP(event.id, 'attending')}
                            className={`flex-1 ${userRSVP?.status === 'attending' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Attending
                          </Button>
                          <Button
                            variant={userRSVP?.status === 'maybe' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRSVP(event.id, 'maybe')}
                            className={`flex-1 ${userRSVP?.status === 'maybe' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Maybe
                          </Button>
                          <Button
                            variant={userRSVP?.status === 'not_attending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRSVP(event.id, 'not_attending')}
                            className={`flex-1 ${userRSVP?.status === 'not_attending' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Not Going
                          </Button>
                        </div>
                        {/* RSVP Summary */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {rsvpCounts.attending} attending
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              {rsvpCounts.maybe} maybe
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              {rsvpCounts.not_attending} not going
                            </span>
                          </div>
                        </div>
                        {/* Recent RSVP */}
                        {recentAttendee && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={recentAttendee[1].profilePicture} />
                              <AvatarFallback className="text-xs">
                                {recentAttendee[1].name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-gray-700 dark:text-gray-300">
                              {recentAttendee[0] === user?.userId ? 'You' : recentAttendee[1].name}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                recentAttendee[1].status === 'attending' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : recentAttendee[1].status === 'maybe'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {recentAttendee[1].status.replace('_', ' ')}
                            </Badge>
                          </div>
                        )}
                        {/* Expanded attendee list below RSVP */}
                        {showAllAttendees[event.id] && (
                          <div className="mt-2 space-y-1">
                            {attendeeEntries.map(([userId, attendee]) => (
                              <div key={userId} className="flex items-center gap-2 text-xs">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={attendee.profilePicture} />
                                  <AvatarFallback className="text-xs">
                                    {attendee.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {userId === user?.userId ? 'You' : attendee.name}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    attendee.status === 'attending' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      : attendee.status === 'maybe'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  {attendee.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Event Title *</Label>
              <Input
                id="edit-title"
                value={eventForm.title}
                onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Mom's Birthday Party"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-eventType">Event Type</Label>
              <Select value={eventForm.eventType} onValueChange={(value) => setEventForm(prev => ({ ...prev, eventType: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Time *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={eventForm.location}
                onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Family Home, Restaurant Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={eventForm.description}
                onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add details about the event..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingEvent(null); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEditEvent} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;
