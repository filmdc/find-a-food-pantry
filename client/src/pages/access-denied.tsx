import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AccessDenied() {
  const { user } = useAuth();
  const { toast } = useToast();

  const requestAdminMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/auth/request-admin');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Admin Access Requested",
        description: "Your request has been submitted. You'll be notified when it's approved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to request admin access. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {user?.status === 'pending' ? (
            <>
              <div className="flex items-center justify-center space-x-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Your account is pending approval</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Your admin request is being reviewed. You'll receive access once approved by a super administrator.
              </p>
            </>
          ) : user?.status === 'rejected' ? (
            <>
              <div className="flex items-center justify-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Access denied</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Your admin request has been denied. Please contact a super administrator if you believe this is an error.
              </p>
            </>
          ) : user?.role === 'user' ? (
            <>
              <p className="text-muted-foreground text-sm">
                You need administrator privileges to access this area.
              </p>
              <Button 
                onClick={() => requestAdminMutation.mutate()}
                disabled={requestAdminMutation.isPending}
                data-testid="button-request-admin"
                className="w-full"
              >
                {requestAdminMutation.isPending ? 'Requesting...' : 'Request Admin Access'}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              You don't have the required permissions to access this area.
            </p>
          )}
          
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              data-testid="button-back-home"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}