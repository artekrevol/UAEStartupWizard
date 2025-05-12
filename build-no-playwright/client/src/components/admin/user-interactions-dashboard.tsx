/**
 * User Interactions Dashboard Component
 * 
 * This component provides administrators with a comprehensive view
 * of user interactions within the application, including filtering,
 * statistics, and data export capabilities.
 */

import { useState, useEffect, ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Search, RefreshCw, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface UserInteraction {
  id: number;
  userId: number | null;
  username: string | null;
  interactionType: string;
  component: string | null;
  pageUrl: string | null;
  metadata: Record<string, any>;
  timestamp: string;
  ipAddress: string | null;
}

interface InteractionsResponse {
  data: UserInteraction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InteractionStats {
  interactionTypeStats: { type: string; count: number }[];
  timeStats: { time: string; count: number }[];
  userStats: { userId: number; username: string; count: number }[];
  totalInteractions: number;
}

interface FilterState {
  username: string;
  interactionType: string;
  pageUrl: string;
  fromDate: Date | null;
  toDate: Date | null;
}

const initialFilterState: FilterState = {
  username: "",
  interactionType: "",
  pageUrl: "",
  fromDate: null,
  toDate: null,
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function UserInteractionsDashboard() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  
  // Build query string for filtering
  const buildQueryString = (page: number, limit: number, filters: FilterState) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (filters.username) params.append("username", filters.username);
    if (filters.interactionType) params.append("interactionType", filters.interactionType);
    if (filters.pageUrl) params.append("pageUrl", filters.pageUrl);
    if (filters.fromDate) params.append("fromDate", filters.fromDate.toISOString());
    if (filters.toDate) params.append("toDate", filters.toDate.toISOString());
    
    return params.toString();
  };
  
  // Fetch user interactions data
  const {
    data: interactionsData,
    isLoading,
    isError,
    refetch,
  } = useQuery<InteractionsResponse>({
    queryKey: ["/api/admin/user-interactions", page, limit, filters],
    queryFn: async () => {
      const queryString = buildQueryString(page, limit, filters);
      const response = await fetch(`/api/admin/user-interactions?${queryString}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user interactions");
      }
      return await response.json();
    },
  });
  
  // Fetch statistics data
  const {
    data: statsData,
    isLoading: isStatsLoading,
    isError: isStatsError,
  } = useQuery<InteractionStats>({
    queryKey: ["/api/admin/user-interactions/stats", filters],
    queryFn: async () => {
      const queryString = buildQueryString(1, 1000, filters); // Large limit for stats
      const response = await fetch(`/api/admin/user-interactions/stats?${queryString}`);
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }
      return await response.json();
    },
  });
  
  // Handle filter changes
  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  
  // Apply filters
  const applyFilters = () => {
    setPage(1); // Reset to first page when applying new filters
    refetch();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters(initialFilterState);
    setPage(1);
    refetch();
  };
  
  // Export data as CSV
  const exportData = async () => {
    try {
      const queryString = buildQueryString(1, 1000, filters); // Export with large limit
      const response = await fetch(`/api/admin/user-interactions/export?${queryString}`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `user-interactions-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "User interactions data has been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export user interactions data",
        variant: "destructive",
      });
      console.error("Export error:", error);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Render error state
  if (isError) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Data</h2>
        <p className="mb-4">Failed to load user interactions data. Please try again later.</p>
        <Button onClick={() => refetch()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }
  
  // Calculate pagination details
  const totalPages = interactionsData?.pagination.totalPages || 1;
  const paginationRange = [];
  const delta = 2; // Number of pages to show before and after current page
  
  // Calculate pagination range
  for (
    let i = Math.max(1, page - delta);
    i <= Math.min(totalPages, page + delta);
    i++
  ) {
    paginationRange.push(i);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Interactions Dashboard</h1>
          <p className="text-muted-foreground">
            Track and analyze user behavior across the application
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            onClick={exportData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Filters Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter user interactions by various parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                name="username"
                placeholder="Filter by username"
                value={filters.username}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="interactionType" className="text-sm font-medium">
                Interaction Type
              </label>
              <Select
                value={filters.interactionType}
                onValueChange={(value) => handleSelectChange("interactionType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="page_view">Page View</SelectItem>
                  <SelectItem value="button_click">Button Click</SelectItem>
                  <SelectItem value="form_submit">Form Submit</SelectItem>
                  <SelectItem value="api_call">API Call</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="pageUrl" className="text-sm font-medium">
                Page URL
              </label>
              <Input
                id="pageUrl"
                name="pageUrl"
                placeholder="Filter by URL path"
                value={filters.pageUrl}
                onChange={handleFilterChange}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <DatePicker
                date={filters.fromDate}
                setDate={(date) => setFilters((prev) => ({ ...prev, fromDate: date }))}
                placeholder="Start date"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <DatePicker
                date={filters.toDate}
                setDate={(date) => setFilters((prev) => ({ ...prev, toDate: date }))}
                placeholder="End date"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
          <Button onClick={applyFilters} className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Apply Filters
          </Button>
        </CardFooter>
      </Card>
      
      {/* Analytics Section */}
      <Tabs defaultValue="table" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Data Table
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Charts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="table">
          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Interactions</CardTitle>
              <CardDescription>
                Showing {interactionsData?.data.length || 0} of{" "}
                {interactionsData?.pagination.total || 0} total interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Page URL</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interactionsData?.data.map((interaction) => (
                      <TableRow key={interaction.id}>
                        <TableCell>
                          {interaction.username || `User ${interaction.userId || 'Anonymous'}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {interaction.interactionType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{interaction.component || "-"}</TableCell>
                        <TableCell>{interaction.pageUrl || "-"}</TableCell>
                        <TableCell>
                          {new Date(interaction.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{interaction.ipAddress || "-"}</TableCell>
                      </TableRow>
                    ))}
                    
                    {!interactionsData?.data.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No interactions found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {page > 3 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {page > 4 && (
                      <PaginationItem>
                        <span className="flex h-10 w-10 items-center justify-center">...</span>
                      </PaginationItem>
                    )}
                    
                    {paginationRange.map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          isActive={pageNum === page}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    {page < totalPages - 3 && (
                      <PaginationItem>
                        <span className="flex h-10 w-10 items-center justify-center">...</span>
                      </PaginationItem>
                    )}
                    
                    {page < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationLink onClick={() => setPage(totalPages)}>
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="charts">
          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interaction Types Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Interaction Types
                </CardTitle>
                <CardDescription>
                  Distribution of different interaction types
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : statsData?.interactionTypeStats.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statsData.interactionTypeStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="count"
                        nameKey="type"
                        label={({ type }) => type.replace(/_/g, " ")}
                      >
                        {statsData.interactionTypeStats.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          value,
                          name.replace(/_/g, " "),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Time-based Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Interactions Over Time
                </CardTitle>
                <CardDescription>
                  Number of interactions per time period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : statsData?.timeStats.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData.timeStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="var(--color-primary)"
                        name="Interactions"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Top Users */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Most Active Users</CardTitle>
                <CardDescription>
                  Users with the highest number of interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : statsData?.userStats.length ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User ID</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Interaction Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsData.userStats.map((user) => (
                          <TableRow key={user.userId}>
                            <TableCell>{user.userId}</TableCell>
                            <TableCell>{user.username || 'Anonymous'}</TableCell>
                            <TableCell>{user.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <p className="text-muted-foreground">No user data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}