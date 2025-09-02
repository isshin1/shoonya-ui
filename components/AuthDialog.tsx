'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from "@/app/contexts/SessionContext";
import { useState } from 'react';
import { API_BASE_URL } from "@/utils/env"
import { useRouter } from 'next/navigation';
const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const signUpSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

// Interface for the authentication response matching your Spring Boot backend
interface AuthResponse {
  token: string;
  roles: string[];
}

export function AuthDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { login } = useSession();
  const [activeTab, setActiveTab] = useState('signin');
  const { toast } = useToast()
  const router = useRouter();
  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  async function onSignInSubmit(values: z.infer<typeof signInSchema>) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        // Success case
        const data = await response.json();
        
        if (data.token && data.roles) {
          // Success toast
          toast({
            title: "Welcome back!",
            description: "You have been signed in successfully."
          });
          
          // Pass both token and roles to the login function
          login(data.token, data.roles);
          onOpenChange(false);
          router.push("/");
        } else {
          throw new Error('Token or roles not found in response');
        }
      } else {
        // Error case - handle different status codes
        let errorMessage = "Invalid email or password. Please try again.";
        
        try {
          const text = await response.text();
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              // If not JSON, use the text as error message
              errorMessage = text;
            }
          }
        } catch (e) {
          // If we can't read the response, use default message
          console.error('Could not read error response:', e);
        }

        // Show appropriate error based on status code
        if (response.status === 401) {
          toast({
            title: "Authentication Failed",
            description: errorMessage,
            variant: "destructive"
          });
        } else if (response.status === 403) {
          toast({
            title: "Account Disabled",
            description: errorMessage,
            variant: "destructive"
          });
        } else if (response.status === 423) { // 423 is Locked status
          toast({
            title: "Account Locked",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      // Network errors or other unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      
      toast({
        title: "Connection Error",
        description: `Sign in failed: ${errorMessage}`,
        variant: "destructive"
      });
      
      console.error('Sign in failed:', error);
    }
  }

  async function onSignUpSubmit(values: z.infer<typeof signUpSchema>) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        // Success case
        toast({
          title: "Account Created!",
          description: "Sign up successful! You can now sign in with your credentials."
        });
        setActiveTab('signin');
        signUpForm.reset();
      } else {
        // Error case - handle different status codes
        let errorMessage = "Something went wrong. Please try again.";
        
        try {
          const text = await response.text();
          if (text) {
            try {
              const errorData = JSON.parse(text);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              // If not JSON, use the text as error message
              errorMessage = text;
            }
          }
        } catch (e) {
          // If we can't read the response, use default message
          console.error('Could not read error response:', e);
        }

        // Show appropriate error based on status code
        if (response.status === 409) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
        } else if (response.status === 400) {
          toast({
            title: "Invalid Data",
            description: errorMessage,
            variant: "destructive"
          });
        } else if (response.status === 422) {
          toast({
            title: "Validation Error",
            description: errorMessage,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      // Network errors or other unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      
      toast({
        title: "Connection Error",
        description: `Sign up failed: ${errorMessage}`,
        variant: "destructive"
      });
      
      console.error('Sign up failed:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="signin">
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-6">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="signup">
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-6">
                <FormField
                  control={signUpForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Sign Up
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}