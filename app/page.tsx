'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Menu, 
  Wand2, 
  Settings, 
  Copy, 
  Clock, 
  Sparkles,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface HistoryItem {
  id: string;
  userPrompt: string;
  generatedDescription: string;
  timestamp: string;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState('');

  console.log('Component mounted, loading history from localStorage');

  // Load history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('eventscribe-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
        console.log('History loaded from localStorage:', parsedHistory);
      } catch (error) {
        console.error('Error parsing history from localStorage:', error);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('eventscribe-history', JSON.stringify(history));
      console.log('History saved to localStorage:', history);
    }
  }, [history]);

  const generateDescription = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate description');
      return;
    }

    setIsGenerating(true);
    setError('');
    console.log('Starting generation with prompt:', prompt);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      console.log('Generated description received:', data);
      
      setGeneratedDescription(data.description);
      
      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        userPrompt: prompt.trim(),
        generatedDescription: data.description,
        timestamp: new Date().toISOString(),
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);
      console.log('Added to history:', newHistoryItem);
      
      toast.success('Description generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectHistoryItem = (item: HistoryItem) => {
    console.log('Selected history item:', item);
    setPrompt(item.userPrompt);
    setGeneratedDescription(item.generatedDescription);
    setError('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDescription);
      toast.success('Description copied to clipboard!');
      console.log('Description copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-lg transition-transform duration-300 z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Generation History
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="p-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No generations yet</p>
              </div>
            ) : (
              history.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => selectHistoryItem(item)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-slate-900 mb-1 line-clamp-2">
                      {item.userPrompt}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                EventScribe AI
              </h1>
              <p className="text-slate-600 text-sm">Generate data-driven event descriptions instantly</p>
            </div>
          </div>
          
          <Link href="/manage-data">
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Manage Data
            </Button>
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            {/* Input Form */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Generate Event Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe the event you want to generate content for... (e.g., 'Create a description for our annual tech conference focusing on AI and machine learning')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <Button 
                  onClick={generateDescription}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Description
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-800 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Generated Description */}
            {generatedDescription && (
              <Card className="shadow-lg border-green-200">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generated Event Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {generatedDescription}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50">
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
