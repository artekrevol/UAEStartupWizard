import { DocumentImport } from '@/components/documents/document-import';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Redirect } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}