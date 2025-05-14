import { DocumentImport } from '@/components/documents/document-import';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Redirect, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Activity, Users, Database } from 'lucide-react';
import { DocumentList } from '@/components/documents/document-list';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  
  // Redirect if not authenticated or loading
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Check if user has admin role
  // Since we just added the role field to the schema, we're being cautious here
  const userRole = (user as any).role;
  const isAdmin = userRole === 'admin';
  
  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="scraper">Scraper</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-6">
            <DocumentImport />
            <DocumentList />
          </TabsContent>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">User management functionality coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="scraper">
            <Card>
              <CardHeader>
                <CardTitle>Scraper Management</CardTitle>
                <CardDescription>
                  Control and monitor scraper activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Scraper management functionality coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    User Interactions
                  </CardTitle>
                  <CardDescription>
                    Track and analyze user behavior across the application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Monitor user interactions, page views, clicks, and other engagement metrics to improve the user experience and identify areas for optimization.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button asChild>
                    <Link href="/admin/user-interactions">
                      View Dashboard
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    User Analytics
                  </CardTitle>
                  <CardDescription>
                    Insights into user behavior and demographics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Analyze user demographics, session data, and conversion metrics to understand your user base better.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" disabled>
                    Coming Soon
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Business Setup Analytics
                  </CardTitle>
                  <CardDescription>
                    Performance metrics for business setup processes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track business setup completion rates, popular free zones, and common business activities.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" disabled>
                    Coming Soon
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}