import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "../../../shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useEffect } from "react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Get redirectTo from URL query parameters
  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('redirectTo') || '/';
    }
    return '/';
  };

  // Use useEffect to navigate after render instead of during render
  useEffect(() => {
    if (user) {
      // Redirect to the specified page or home page
      setLocation(getRedirectPath());
    }
  }, [user, setLocation]);
  
  // If user is logged in, show nothing while waiting for redirect
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              UAE Business Setup Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm onSubmit={(data) => loginMutation.mutate(data)} />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm onSubmit={(data) => registerMutation.mutate(data)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-white">
          <h1 className="text-4xl font-bold mb-6">
            Start Your UAE Business Journey Today
          </h1>
          <p className="text-lg opacity-90 mb-8">
            Our AI-powered platform simplifies business setup in UAE with personalized recommendations,
            document management, and expert guidance every step of the way.
          </p>
          <ul className="space-y-4">
            {[
              "AI-Powered Free Zone Recommendations",
              "Automated Document Generation",
              "Progress Tracking Dashboard",
              "Expert Support System"
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  onSubmit,
}: {
  onSubmit: (data: { username: string; password: string }) => void;
}) {
  const form = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <Label>Username</Label>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <Label>Password</Label>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm({
  onSubmit,
}: {
  onSubmit: (data: { username: string; email: string; password: string; companyName?: string; terms_accepted: boolean }) => void;
}) {
  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      companyName: "",
      terms_accepted: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <Label>Username</Label>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <Label>Email</Label>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <Label>Password</Label>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <Label>Company Name</Label>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="terms_accepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <Label>
                  I accept the <a href="#" className="text-primary">Terms and Conditions</a>
                </Label>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Register
        </Button>
      </form>
    </Form>
  );
}