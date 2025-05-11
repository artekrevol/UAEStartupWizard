/**
 * User Interactions Dashboard Component
 * 
 * This component provides administrators with a comprehensive view
 * of user interactions within the application, including filtering,
 * statistics, and data export capabilities.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserInteraction } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Download, Filter, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Interface for API response
interface InteractionsResponse {
  data: UserInteraction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Interface for statistics response
interface InteractionStats {
  interactionTypeStats: { type: string; count: number }[];
  timeStats: { time: string; count: number }[];
  userStats: { userId: number; username: string; count: number }[];
  totalInteractions: number;
}

// Filter state interface
interface FilterState {
  username: string;
  interactionType: string;
  pageUrl: string;
  fromDate: Date | null;
  toDate: Date | null;
}

// Colors for charts
const CHART_COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
  '#d0ed57', '#ffc658', '#ff8042', '#ff6361', '#bc5090',
  '#58508d', '#003f5c', '#7a5195', '#ef5675', '#ffa600'
];

export function UserInteractionsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can access this dashboard.",
        variant: "destructive"
      });
    }
  }, [user, toast]);
  
  // State for pagination and filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [activeTab, setActiveTab] = useState('list');
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('day');
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    username: '',
    interactionType: '',
    pageUrl: '',
    fromDate: null,
    toDate: null
  });
  
  // Build query string from filters
  const buildQueryString = (page: number, limit: number, filters: FilterState) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    if (filters.username) params.append('username', filters.username);
    if (filters.interactionType) params.append('interactionType', filters.interactionType);
    if (filters.pageUrl) params.append('pageUrl', filters.pageUrl);
    if (filters.fromDate) params.append('fromDate', filters.fromDate.toISOString());
    if (filters.toDate) params.append('toDate', filters.toDate.toISOString());
    
    return params.toString();
  };
  
  // Fetch interactions data
  const { 
    data: interactionsData, 
    isLoading: isLoadingInteractions,
    error: interactionsError,
    refetch: refetchInteractions
  } = useQuery<InteractionsResponse>({
    queryKey: ['/api/user-interactions', page, limit, filters],
    queryFn: async () => {
      const queryString = buildQueryString(page, limit, filters);
      const response = await fetch(`/api/user-interactions?${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user interactions');
      }
      return response.json();
    },
    enabled: user?.role === 'admin' && activeTab === 'list'
  });
  
  // Fetch statistics data
  const { 
    data: statsData, 
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery<InteractionStats>({
    queryKey: ['/api/user-interactions/stats', timeframe, filters],
    queryFn: async () => {
      let queryString = `timeframe=${timeframe}`;
      
      if (filters.username) queryString += `&username=${encodeURIComponent(filters.username)}`;
      if (filters.interactionType) queryString += `&interactionType=${encodeURIComponent(filters.interactionType)}`;
      if (filters.fromDate) queryString += `&fromDate=${filters.fromDate.toISOString()}`;
      if (filters.toDate) queryString += `&toDate=${filters.toDate.toISOString()}`;
      
      const response = await fetch(`/api/user-interactions/stats?${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interaction statistics');
      }
      return response.json();
    },
    enabled: user?.role === 'admin' && activeTab === 'stats'
  });
  
  // Handle filter change
  const handleFilterChange = (name: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset to first page when filters change
    setPage(1);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      username: '',
      interactionType: '',
      pageUrl: '',
      fromDate: null,
      toDate: null
    });
    setPage(1);
  };
  
  // Handle refreshing the data
  const refreshData = () => {
    if (activeTab === 'list') {
      refetchInteractions();
    } else if (activeTab === 'stats') {
      refetchStats();
    }
    
    toast({
      title: "Data Refreshed",
      description: "The interaction data has been refreshed.",
    });
  };
  
  // Export data to CSV
  const exportToCSV = () => {
    if (!interactionsData?.data.length) {
      toast({
        title: "No Data",
        description: "There is no data to export.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Generate headers
      const headers = [
        'ID', 'User ID', 'Username', 'Session ID', 'Interaction Type',
        'Page URL', 'Component', 'Element ID', 'Element Text',
        'Interaction Value', 'User Agent', 'IP Address',
        'Device Type', 'Duration', 'Success', 'Created At'
      ].join(',');
      
      // Generate row data
      const rows = interactionsData.data.map(interaction => {
        return [
          interaction.id,
          interaction.userId,
          interaction.username,
          interaction.sessionId,
          interaction.interactionType,
          interaction.pageUrl,
          interaction.component,
          interaction.elementId,
          interaction.elementText,
          interaction.interactionValue,
          interaction.userAgent,
          interaction.ipAddress,
          interaction.deviceType,
          interaction.duration,
          interaction.success,
          new Date(interaction.createdAt).toISOString()
        ].map(value => {
          // Properly format CSV values
          if (value === null || value === undefined) return '';
          // Escape quotes and wrap in quotes if it's a string with special characters
          if (typeof value === 'string') {
            value = value.replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              value = `"${value}"`;
            }
          }
          return value;
        }).join(',');
      }).join('\n');
      
      // Combine headers and rows
      const csv = `${headers}\n${rows}`;
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `user-interactions-${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Interaction data has been exported to CSV.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive"
      });
    }
  };
  
  // Format date/time for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };
  
  // Prepare chart data for time-based stats
  const prepareTimeChartData = () => {
    if (!statsData?.timeStats) return [];
    
    return statsData.timeStats.map(stat => ({
      time: new Date(stat.time).toLocaleString(),
      count: stat.count
    }));
  };
  
  // Render table of interactions
  const renderInteractionsTable = () => {
    if (isLoadingInteractions) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (interactionsError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <p>Error loading interaction data</p>
          <Button variant="outline" onClick={() => refetchInteractions()} className="mt-4">
            Try Again
          </Button>
        </div>
      );
    }
    
    if (!interactionsData?.data.length) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>No interaction data found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      );
    }
    
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Interaction Type</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Element</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interactionsData.data.map((interaction) => (
              <TableRow key={interaction.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(interaction.createdAt.toString())}
                </TableCell>
                <TableCell>
                  {interaction.username || <span className="text-muted-foreground">Anonymous</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{interaction.interactionType}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {interaction.pageUrl || '-'}
                </TableCell>
                <TableCell>
                  {interaction.component || '-'}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {interaction.elementText || interaction.elementId || '-'}
                </TableCell>
                <TableCell>
                  {interaction.interactionValue ? (
                    <span className="text-xs text-muted-foreground truncate max-w-[150px] inline-block">
                      {interaction.interactionValue}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {interactionsData.data.length} of {interactionsData.pagination.total} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page => Math.max(page - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="text-sm">
              Page {page} of {interactionsData.pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page => Math.min(page + 1, interactionsData.pagination.totalPages))}
              disabled={page === interactionsData.pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  };
  
  // Render statistics charts and data
  const renderStatistics = () => {
    if (isLoadingStats) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (statsError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive">
          <p>Error loading statistics</p>
          <Button variant="outline" onClick={() => refetchStats()} className="mt-4">
            Try Again
          </Button>
        </div>
      );
    }
    
    if (!statsData) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>No statistics available</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Interactions</CardTitle>
              <CardDescription>Overall count of tracked interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{statsData.totalInteractions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Top Interaction Type</CardTitle>
              <CardDescription>Most common user interaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsData.interactionTypeStats[0]?.type || 'No data'}
              </div>
              <div className="text-muted-foreground">
                {statsData.interactionTypeStats[0]?.count || 0} instances
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Users with tracked interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{statsData.userStats.length}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Interaction Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Interaction Types Distribution</CardTitle>
            <CardDescription>
              Breakdown of interaction types over the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData.interactionTypeStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="type"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statsData.interactionTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} interactions`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Time-based Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Interactions Over Time</CardTitle>
            <CardDescription>
              Trend of interactions during the selected timeframe
            </CardDescription>
            <div className="flex justify-end">
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last 24 Hours</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareTimeChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return timeframe === 'day' 
                        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString();
                    }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Interactions" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Top Users Table */}
        {statsData.userStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Active Users</CardTitle>
              <CardDescription>
                Users with the most interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Interactions</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statsData.userStats.slice(0, 10).map((userStat) => (
                    <TableRow key={userStat.userId || userStat.username}>
                      <TableCell>
                        {userStat.username || <span className="text-muted-foreground">Anonymous</span>}
                      </TableCell>
                      <TableCell>{userStat.count}</TableCell>
                      <TableCell>
                        {((userStat.count / statsData.totalInteractions) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  
  // Admin access check
  if (user && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You need administrator privileges to access this page.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Interactions Dashboard</h1>
          <p className="text-muted-foreground">
            Track and analyze user behavior across the application
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow down the interaction data by applying filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
                placeholder="Filter by username"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interactionType">Interaction Type</Label>
              <Select 
                value={filters.interactionType} 
                onValueChange={(value) => handleFilterChange('interactionType', value)}
              >
                <SelectTrigger id="interactionType">
                  <SelectValue placeholder="All interaction types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All interaction types</SelectItem>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="button_click">Button Click</SelectItem>
                  <SelectItem value="link_click">Link Click</SelectItem>
                  <SelectItem value="form_submit">Form Submit</SelectItem>
                  <SelectItem value="form_error">Form Error</SelectItem>
                  <SelectItem value="api_request">API Request</SelectItem>
                  <SelectItem value="document_view">Document View</SelectItem>
                  <SelectItem value="document_download">Document Download</SelectItem>
                  <SelectItem value="search_query">Search Query</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="error_encounter">Error Encounter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pageUrl">Page URL</Label>
              <Input 
                id="pageUrl"
                placeholder="Filter by page URL"
                value={filters.pageUrl}
                onChange={(e) => handleFilterChange('pageUrl', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>From Date</Label>
              <DatePicker
                date={filters.fromDate}
                setDate={(date) => handleFilterChange('fromDate', date)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>To Date</Label>
              <DatePicker
                date={filters.toDate}
                setDate={(date) => handleFilterChange('toDate', date)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </CardFooter>
      </Card>
      
      {/* Tab Controls */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Interaction List</TabsTrigger>
          <TabsTrigger value="stats">Statistics & Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Interactions</CardTitle>
              <CardDescription>
                Detailed list of all tracked user interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {renderInteractionsTable()}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          {renderStatistics()}
        </TabsContent>
      </Tabs>
    </div>
  );
}