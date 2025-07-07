'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Mic, 
  Clock,
  Trophy,
  Building,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Event {
  id: number;
  name: string;
  type: string;
  date: string;
  location: string;
  description?: string;
  capacity: number;
  status: string;
  speaker_count: number;
  session_count: number;
  created_at: string;
}

interface Speaker {
  id: number;
  name: string;
  topic: string;
  bio?: string;
  company?: string;
  event_id?: number;
  event_name?: string;
  event_type?: string;
  created_at: string;
}

interface Session {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  room?: string;
  event_id?: number;
  speaker_id?: number;
  event_name?: string;
  speaker_name?: string;
  created_at: string;
}

interface Sponsor {
  id: number;
  name: string;
  tier: string;
  logo_url?: string;
  website?: string;
  event_id?: number;
  event_name?: string;
  created_at: string;
}

export default function ManageData() {
  const [events, setEvents] = useState<Event[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  console.log('ManageData component mounted');

  // Event form state
  const [eventForm, setEventForm] = useState({
    name: '',
    type: '',
    date: '',
    location: '',
    description: '',
    capacity: 0,
    status: 'planning',
  });

  // Speaker form state
  const [speakerForm, setSpeakerForm] = useState({
    name: '',
    topic: '',
    bio: '',
    company: '',
    event_id: '',
  });

  // Session form state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    room: '',
    event_id: '',
    speaker_id: '',
  });

  // Sponsor form state
  const [sponsorForm, setSponsorForm] = useState({
    name: '',
    tier: '',
    logo_url: '',
    website: '',
    event_id: '',
  });

  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    console.log('Loading all data...');
    setLoading(true);
    
    try {
      const [eventsRes, speakersRes, sessionsRes, sponsorsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/speakers'),
        fetch('/api/sessions'),
        fetch('/api/sponsors'),
      ]);

      console.log('API responses received');

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        console.log('Events loaded:', eventsData.length);
      }

      if (speakersRes.ok) {
        const speakersData = await speakersRes.json();
        setSpeakers(speakersData);
        console.log('Speakers loaded:', speakersData.length);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
        console.log('Sessions loaded:', sessionsData.length);
      }

      if (sponsorsRes.ok) {
        const sponsorsData = await sponsorsRes.json();
        setSponsors(sponsorsData);
        console.log('Sponsors loaded:', sponsorsData.length);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting event:', eventForm);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...eventForm,
          capacity: parseInt(eventForm.capacity.toString()),
        }),
      });

      if (response.ok) {
        toast.success('Event created successfully!');
        setEventForm({
          name: '',
          type: '',
          date: '',
          location: '',
          description: '',
          capacity: 0,
          status: 'planning',
        });
        loadAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleSpeakerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting speaker:', speakerForm);

    try {
      const response = await fetch('/api/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...speakerForm,
          event_id: speakerForm.event_id ? parseInt(speakerForm.event_id) : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Speaker created successfully!');
        setSpeakerForm({
          name: '',
          topic: '',
          bio: '',
          company: '',
          event_id: '',
        });
        loadAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create speaker');
      }
    } catch (error) {
      console.error('Error creating speaker:', error);
      toast.error('Failed to create speaker');
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting session:', sessionForm);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionForm,
          event_id: sessionForm.event_id ? parseInt(sessionForm.event_id) : undefined,
          speaker_id: sessionForm.speaker_id ? parseInt(sessionForm.speaker_id) : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Session created successfully!');
        setSessionForm({
          title: '',
          description: '',
          start_time: '',
          end_time: '',
          room: '',
          event_id: '',
          speaker_id: '',
        });
        loadAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting sponsor:', sponsorForm);

    try {
      const response = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sponsorForm,
          event_id: sponsorForm.event_id ? parseInt(sponsorForm.event_id) : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Sponsor created successfully!');
        setSponsorForm({
          name: '',
          tier: '',
          logo_url: '',
          website: '',
          event_id: '',
        });
        loadAllData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create sponsor');
      }
    } catch (error) {
      console.error('Error creating sponsor:', error);
      toast.error('Failed to create sponsor');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      planning: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, string> = {
      platinum: 'bg-purple-100 text-purple-800',
      gold: 'bg-yellow-100 text-yellow-800',
      silver: 'bg-gray-100 text-gray-800',
      bronze: 'bg-orange-100 text-orange-800',
    };
    return variants[tier] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Database Management</h1>
              <p className="text-slate-600 text-sm">Manage events, speakers, sessions, and sponsors</p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Events ({events.length})
              </TabsTrigger>
              <TabsTrigger value="speakers" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Speakers ({speakers.length})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sessions ({sessions.length})
              </TabsTrigger>
              <TabsTrigger value="sponsors" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Sponsors ({sponsors.length})
              </TabsTrigger>
            </TabsList>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Add Event Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add New Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleEventSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="event-name">Event Name</Label>
                        <Input
                          id="event-name"
                          value={eventForm.name}
                          onChange={(e) => setEventForm({...eventForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-type">Event Type</Label>
                        <Input
                          id="event-type"
                          value={eventForm.type}
                          onChange={(e) => setEventForm({...eventForm, type: e.target.value})}
                          placeholder="e.g., Conference, Workshop, Meetup"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-date">Date</Label>
                        <Input
                          id="event-date"
                          type="date"
                          value={eventForm.date}
                          onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-location">Location</Label>
                        <Input
                          id="event-location"
                          value={eventForm.location}
                          onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-capacity">Capacity</Label>
                        <Input
                          id="event-capacity"
                          type="number"
                          value={eventForm.capacity}
                          onChange={(e) => setEventForm({...eventForm, capacity: parseInt(e.target.value) || 0})}
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event-status">Status</Label>
                        <Select value={eventForm.status} onValueChange={(value) => setEventForm({...eventForm, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="event-description">Description (Optional)</Label>
                        <Textarea
                          id="event-description"
                          value={eventForm.description}
                          onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Create Event
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Events Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Stats</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.name}</TableCell>
                              <TableCell>{event.type}</TableCell>
                              <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge className={getStatusBadge(event.status)}>
                                  {event.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{event.capacity}</TableCell>
                              <TableCell>
                                <div className="text-xs text-slate-500">
                                  {event.speaker_count} speakers, {event.session_count} sessions
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Speakers Tab */}
            <TabsContent value="speakers" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Add Speaker Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add New Speaker
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSpeakerSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="speaker-name">Speaker Name</Label>
                        <Input
                          id="speaker-name"
                          value={speakerForm.name}
                          onChange={(e) => setSpeakerForm({...speakerForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="speaker-topic">Topic</Label>
                        <Input
                          id="speaker-topic"
                          value={speakerForm.topic}
                          onChange={(e) => setSpeakerForm({...speakerForm, topic: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="speaker-company">Company (Optional)</Label>
                        <Input
                          id="speaker-company"
                          value={speakerForm.company}
                          onChange={(e) => setSpeakerForm({...speakerForm, company: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="speaker-event">Event</Label>
                        <Select value={speakerForm.event_id} onValueChange={(value) => setSpeakerForm({...speakerForm, event_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No event assigned</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id.toString()}>
                                {event.name} ({event.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="speaker-bio">Bio (Optional)</Label>
                        <Textarea
                          id="speaker-bio"
                          value={speakerForm.bio}
                          onChange={(e) => setSpeakerForm({...speakerForm, bio: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Create Speaker
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Speakers Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Speakers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Event</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {speakers.map((speaker) => (
                            <TableRow key={speaker.id}>
                              <TableCell className="font-medium">{speaker.name}</TableCell>
                              <TableCell>{speaker.topic}</TableCell>
                              <TableCell>{speaker.company || '-'}</TableCell>
                              <TableCell>
                                {speaker.event_name ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{speaker.event_name}</div>
                                    <div className="text-slate-500">{speaker.event_type}</div>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Add Session Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add New Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSessionSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="session-title">Session Title</Label>
                        <Input
                          id="session-title"
                          value={sessionForm.title}
                          onChange={(e) => setSessionForm({...sessionForm, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="session-start">Start Time</Label>
                          <Input
                            id="session-start"
                            type="time"
                            value={sessionForm.start_time}
                            onChange={(e) => setSessionForm({...sessionForm, start_time: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="session-end">End Time</Label>
                          <Input
                            id="session-end"
                            type="time"
                            value={sessionForm.end_time}
                            onChange={(e) => setSessionForm({...sessionForm, end_time: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="session-room">Room (Optional)</Label>
                        <Input
                          id="session-room"
                          value={sessionForm.room}
                          onChange={(e) => setSessionForm({...sessionForm, room: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="session-event">Event</Label>
                        <Select value={sessionForm.event_id} onValueChange={(value) => setSessionForm({...sessionForm, event_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No event assigned</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id.toString()}>
                                {event.name} ({event.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="session-speaker">Speaker</Label>
                        <Select value={sessionForm.speaker_id} onValueChange={(value) => setSessionForm({...sessionForm, speaker_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a speaker" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No speaker assigned</SelectItem>
                            {speakers.map((speaker) => (
                              <SelectItem key={speaker.id} value={speaker.id.toString()}>
                                {speaker.name} - {speaker.topic}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="session-description">Description (Optional)</Label>
                        <Textarea
                          id="session-description"
                          value={sessionForm.description}
                          onChange={(e) => setSessionForm({...sessionForm, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Create Session
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Sessions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Speaker</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="font-medium">{session.title}</TableCell>
                              <TableCell>
                                {session.start_time} - {session.end_time}
                              </TableCell>
                              <TableCell>{session.room || '-'}</TableCell>
                              <TableCell>{session.speaker_name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Sponsors Tab */}
            <TabsContent value="sponsors" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Add Sponsor Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add New Sponsor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSponsorSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="sponsor-name">Sponsor Name</Label>
                        <Input
                          id="sponsor-name"
                          value={sponsorForm.name}
                          onChange={(e) => setSponsorForm({...sponsorForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="sponsor-tier">Tier</Label>
                        <Select value={sponsorForm.tier} onValueChange={(value) => setSponsorForm({...sponsorForm, tier: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="platinum">Platinum</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="bronze">Bronze</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="sponsor-website">Website (Optional)</Label>
                        <Input
                          id="sponsor-website"
                          type="url"
                          value={sponsorForm.website}
                          onChange={(e) => setSponsorForm({...sponsorForm, website: e.target.value})}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sponsor-logo">Logo URL (Optional)</Label>
                        <Input
                          id="sponsor-logo"
                          type="url"
                          value={sponsorForm.logo_url}
                          onChange={(e) => setSponsorForm({...sponsorForm, logo_url: e.target.value})}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sponsor-event">Event</Label>
                        <Select value={sponsorForm.event_id} onValueChange={(value) => setSponsorForm({...sponsorForm, event_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No event assigned</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id.toString()}>
                                {event.name} ({event.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        Create Sponsor
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Sponsors Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Sponsors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Tier</TableHead>
                            <TableHead>Website</TableHead>
                            <TableHead>Event</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sponsors.map((sponsor) => (
                            <TableRow key={sponsor.id}>
                              <TableCell className="font-medium">{sponsor.name}</TableCell>
                              <TableCell>
                                <Badge className={getTierBadge(sponsor.tier)}>
                                  {sponsor.tier}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {sponsor.website ? (
                                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Visit
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>{sponsor.event_name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}