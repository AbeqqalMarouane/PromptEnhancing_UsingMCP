// app/manage-data/page.tsx

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
  Mic, 
  Clock,
  Trophy,
  Save,
  RefreshCw,
  Link as LinkIcon // Import LinkIcon for the website link
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Interfaces
interface Event {
  id: number;
  name: string;
  type: string;
  date: string;
}

interface Speaker {
  id: number;
  name: string;
  topic: string;
  company?: string;
  event_name?: string;
}

interface Session {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  room?: string;
  speaker_name?: string;
  event_name?: string;
}

// CORRECTED: Added optional 'website' property to Sponsor interface
interface Sponsor {
  id: number;
  name: string;
  tier: string;
  website?: string;
  event_name?: string;
}

export default function ManageData() {
  const [events, setEvents] = useState<Event[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  // Form States
  const [eventForm, setEventForm] = useState({ name: '', type: '', date: '', location: '', description: '' });
  const [speakerForm, setSpeakerForm] = useState({ name: '', topic: '', bio: '', company: '', event_id: '' });
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', start_time: '', end_time: '', room: '', event_id: '', speaker_id: '' });
  // CORRECTED: sponsorForm state updated to remove logo_url and only include fields being used.
  const [sponsorForm, setSponsorForm] = useState({ name: '', tier: 'silver', website: '', event_id: '' });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [eventsRes, speakersRes, sessionsRes, sponsorsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/speakers'),
        fetch('/api/sessions'),
        fetch('/api/sponsors'),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (speakersRes.ok) setSpeakers(await speakersRes.json());
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.map((s: any) => ({...s, event_name: s.event_title})));
      }
      if (sponsorsRes.ok) setSponsors(await sponsorsRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const submitForm = async (endpoint: string, body: any, successMessage: string, resetForm: () => void) => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(successMessage);
        resetForm();
        loadAllData();
      } else {
        const errorData = await response.json();
        const details = errorData.details ? Object.values(errorData.details).flat().join(', ') : 'Please check your input.';
        toast.error(`${errorData.message}: ${details}`);
        console.error("Submission failed:", errorData.details);
      }
    } catch (error) {
      console.error(`Error creating item at ${endpoint}:`, error);
      toast.error('An unexpected error occurred.');
    }
  };
  
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm('/api/events', eventForm, 'Event created', () => setEventForm({ name: '', type: '', date: '', location: '', description: '' }));
  };

  const handleSpeakerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = speakerForm.event_id && speakerForm.event_id !== 'none' ? parseInt(speakerForm.event_id) : undefined;
    submitForm('/api/speakers', { ...speakerForm, event_id: eventId }, 'Speaker created', () => setSpeakerForm({ name: '', topic: '', bio: '', company: '', event_id: '' }));
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventIdStr = sessionForm.event_id;
    if (!eventIdStr || eventIdStr === 'none') {
        toast.error("An event must be selected for the session.");
        return;
    }
    const selectedEvent = events.find(event => event.id.toString() === eventIdStr);
    if (!selectedEvent) {
        toast.error("Selected event not found. Please refresh.");
        return;
    }
    const eventDate = new Date(selectedEvent.date);
    const [startHours, startMinutes] = sessionForm.start_time.split(':').map(Number);
    const startTimeObj = new Date(eventDate);
    startTimeObj.setUTCHours(startHours, startMinutes, 0, 0);
    const [endHours, endMinutes] = sessionForm.end_time.split(':').map(Number);
    const endTimeObj = new Date(eventDate);
    endTimeObj.setUTCHours(endHours, endMinutes, 0, 0);
    const payload = {
        ...sessionForm,
        start_time: startTimeObj.toISOString(),
        end_time: endTimeObj.toISOString(),
        event_id: parseInt(eventIdStr),
        speaker_id: sessionForm.speaker_id && sessionForm.speaker_id !== 'none' ? parseInt(sessionForm.speaker_id) : undefined
    };
    submitForm('/api/sessions', payload, 'Session created', () => setSessionForm({ title: '', description: '', start_time: '', end_time: '', room: '', event_id: '', speaker_id: '' }));
  };
  
  const handleSponsorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = sponsorForm.event_id && sponsorForm.event_id !== 'none' ? parseInt(sponsorForm.event_id) : undefined;
    // CORRECTED: The payload now correctly matches the state, and the reset function is also correct.
    submitForm('/api/sponsors', { ...sponsorForm, event_id: eventId }, 'Sponsor created', () => setSponsorForm({ name: '', tier: 'silver', website: '', event_id: '' }));
  };
  
  const getTierBadge = (tier: string) => ({ platinum: 'bg-purple-100 text-purple-800', gold: 'bg-yellow-100 text-yellow-800', silver: 'bg-gray-100 text-gray-800', bronze: 'bg-orange-100 text-orange-800' }[tier?.toLowerCase()] || 'bg-gray-100 text-gray-800');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold">Database Management</h1>
              <p className="text-sm text-slate-600">Manage all conference data</p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>
      </header>
      
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="events"><Calendar className="w-4 h-4 mr-2"/>Events ({events.length})</TabsTrigger>
            <TabsTrigger value="speakers"><Mic className="w-4 h-4 mr-2"/>Speakers ({speakers.length})</TabsTrigger>
            <TabsTrigger value="sessions"><Clock className="w-4 h-4 mr-2"/>Sessions ({sessions.length})</TabsTrigger>
            <TabsTrigger value="sponsors"><Trophy className="w-4 h-4 mr-2"/>Sponsors ({sponsors.length})</TabsTrigger>
          </TabsList>
          
          {/* Events Tab */}
          <TabsContent value="events" className="mt-6 grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><Plus className="inline w-5 h-5 mr-2" />Add New Event</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div><Label htmlFor="event-name">Event Name</Label><Input id="event-name" value={eventForm.name} onChange={(e) => setEventForm({...eventForm, name: e.target.value})} required/></div>
                  <div><Label htmlFor="event-type">Event Type</Label><Input id="event-type" value={eventForm.type} onChange={(e) => setEventForm({...eventForm, type: e.target.value})} placeholder="e.g., Conference" required/></div>
                  <div><Label htmlFor="event-date">Date</Label><Input id="event-date" type="date" value={eventForm.date} onChange={(e) => setEventForm({...eventForm, date: e.target.value})} required/></div>
                  <div><Label htmlFor="event-location">Location</Label><Input id="event-location" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} required/></div>
                  <div><Label htmlFor="event-description">Description (Optional)</Label><Textarea id="event-description" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} rows={3}/></div>
                  <Button type="submit" className="w-full"><Save className="w-4 h-4 mr-2"/>Create Event</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>All Events</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {events.map((event) => <TableRow key={event.id}><TableCell>{event.name}</TableCell><TableCell>{event.type}</TableCell><TableCell>{new Date(event.date).toLocaleDateString()}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speakers Tab */}
          <TabsContent value="speakers" className="mt-6 grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><Plus className="inline w-5 h-5 mr-2"/>Add Speaker</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSpeakerSubmit} className="space-y-4">
                  <div><Label htmlFor="speaker-name">Speaker Name</Label><Input id="speaker-name" value={speakerForm.name} onChange={(e) => setSpeakerForm({...speakerForm, name: e.target.value})} required/></div>
                  <div><Label htmlFor="speaker-topic">Topic</Label><Input id="speaker-topic" value={speakerForm.topic} onChange={(e) => setSpeakerForm({...speakerForm, topic: e.target.value})} required/></div>
                  <div><Label htmlFor="speaker-company">Company (Optional)</Label><Input id="speaker-company" value={speakerForm.company} onChange={(e) => setSpeakerForm({...speakerForm, company: e.target.value})}/></div>
                  <div>
                    <Label htmlFor="speaker-bio">Bio (Optional)</Label>
                    <Textarea id="speaker-bio" value={speakerForm.bio} onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })} rows={3} placeholder="A short biography of the speaker..."/>
                  </div>
                  <div><Label htmlFor="speaker-event">Event</Label><Select value={speakerForm.event_id} onValueChange={(value) => setSpeakerForm({...speakerForm, event_id: value})}><SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger><SelectContent><SelectItem value="none">No event assigned</SelectItem>{events.map((event) => (<SelectItem key={event.id} value={event.id.toString()}>{event.name}</SelectItem>))}</SelectContent></Select></div>
                  <Button type="submit" className="w-full"><Save className="w-4 h-4 mr-2"/>Create Speaker</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>All Speakers</CardTitle></CardHeader>
              <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Topic</TableHead><TableHead>Event</TableHead></TableRow></TableHeader><TableBody>{speakers.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.topic}</TableCell><TableCell>{s.event_name || '-'}</TableCell></TableRow>)}</TableBody></Table></CardContent>
            </Card>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6 grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><Plus className="inline w-5 h-5 mr-2"/>Add Session</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSessionSubmit} className="space-y-4">
                  <div><Label htmlFor="session-title">Session Title</Label><Input id="session-title" value={sessionForm.title} onChange={(e) => setSessionForm({...sessionForm, title: e.target.value})} required/></div>
                  <div><Label htmlFor="session-description">Description (Optional)</Label><Textarea id="session-description" value={sessionForm.description} onChange={(e) => setSessionForm({...sessionForm, description: e.target.value})} rows={3}/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="session-start">Start Time</Label>
                      <Input id="session-start" type="time" value={sessionForm.start_time} onChange={(e) => setSessionForm({...sessionForm, start_time: e.target.value})} required/>
                    </div>
                    <div>
                      <Label htmlFor="session-end">End Time</Label>
                      <Input id="session-end" type="time" value={sessionForm.end_time} onChange={(e) => setSessionForm({...sessionForm, end_time: e.target.value})} required/>
                    </div>
                  </div>
                  <div><Label htmlFor="session-room">Room (Optional)</Label><Input id="session-room" value={sessionForm.room} onChange={(e) => setSessionForm({...sessionForm, room: e.target.value})} placeholder="e.g., Hall A"/></div>
                  <div><Label htmlFor="session-event">Event</Label><Select value={sessionForm.event_id} onValueChange={(value) => setSessionForm({...sessionForm, event_id: value})} required><SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger><SelectContent>{events.map((event) => (<SelectItem key={event.id} value={event.id.toString()}>{event.name}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label htmlFor="session-speaker">Speaker (Optional)</Label><Select value={sessionForm.speaker_id} onValueChange={(value) => setSessionForm({...sessionForm, speaker_id: value})}><SelectTrigger><SelectValue placeholder="Select a speaker" /></SelectTrigger><SelectContent><SelectItem value="none">No speaker assigned (e.g., Lunch)</SelectItem>{speakers.map((speaker) => (<SelectItem key={speaker.id} value={speaker.id.toString()}>{speaker.name}</SelectItem>))}</SelectContent></Select></div>
                  <Button type="submit" className="w-full"><Save className="w-4 h-4 mr-2"/>Create Session</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>All Sessions</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Speaker</TableHead>
                      <TableHead>Event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(s.start_time).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500">{new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </TableCell>
                        <TableCell>{s.room || '-'}</TableCell>
                        <TableCell>{s.speaker_name || '-'}</TableCell>
                        <TableCell>{s.event_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sponsors Tab */}
          <TabsContent value="sponsors" className="mt-6 grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><Plus className="inline w-5 h-5 mr-2"/>Add Sponsor</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSponsorSubmit} className="space-y-4">
                  <div><Label htmlFor="sponsor-name">Sponsor Name</Label><Input id="sponsor-name" value={sponsorForm.name} onChange={(e) => setSponsorForm({...sponsorForm, name: e.target.value})} required/></div>
                  <div><Label htmlFor="sponsor-tier">Tier</Label><Select value={sponsorForm.tier} onValueChange={(value) => setSponsorForm({...sponsorForm, tier: value})} required><SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger><SelectContent><SelectItem value="platinum">Platinum</SelectItem><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="bronze">Bronze</SelectItem></SelectContent></Select></div>
                  {/* CORRECTED: Website input is present, logo_url is gone */}
                  <div><Label htmlFor="sponsor-website">Website (Optional)</Label><Input id="sponsor-website" type="url" value={sponsorForm.website} onChange={(e) => setSponsorForm({...sponsorForm, website: e.target.value})} placeholder="https://example.com"/></div>
                  <div><Label htmlFor="sponsor-event">Event</Label><Select value={sponsorForm.event_id} onValueChange={(value) => setSponsorForm({...sponsorForm, event_id: value})}><SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger><SelectContent><SelectItem value="none">No event assigned</SelectItem>{events.map((event) => (<SelectItem key={event.id} value={event.id.toString()}>{event.name}</SelectItem>))}</SelectContent></Select></div>
                  <Button type="submit" className="w-full"><Save className="w-4 h-4 mr-2"/>Create Sponsor</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>All Sponsors</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  {/* CORRECTED: Table now includes a "Website" column */}
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Event</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge className={getTierBadge(s.tier)}>{s.tier}</Badge></TableCell>
                        <TableCell>
                          {s.website ? (
                            <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              Visit <LinkIcon className="w-3 h-3"/>
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{s.event_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}