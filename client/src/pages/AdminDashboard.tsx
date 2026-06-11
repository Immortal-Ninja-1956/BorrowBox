import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, loading: userLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const {
    data: users,
    isLoading: usersLoading,
    refetch,
  } = trpc.admin.getAllUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const banMutation = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      toast.success("User status updated");
      refetch();
      refetchReports();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const {
    data: reports,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = trpc.admin.getReports.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateReportStatusMutation = trpc.admin.updateReportStatus.useMutation({
    onSuccess: () => {
      toast.success("Report status updated");
      refetchReports();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.admin.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      refetchReports();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  if (userLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );

  if (!user || user.role !== "admin") {
    return <Redirect href="/" />;
  }

  const handleBanToggle = (userId: number, currentStatus: number) => {
    banMutation.mutate({ userId, isBanned: currentStatus === 1 ? 0 : 1 });
  };

  const handleDeleteListing = (itemId: number) => {
    if (confirm("Are you sure you want to permanently delete this listing?")) {
      deleteItemMutation.mutate({ itemId });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <p className="text-4xl font-bold text-accent">
                {stats?.totalUsers || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <p className="text-4xl font-bold text-accent">
                {stats?.totalItems || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <p className="text-4xl font-bold text-accent">
                {stats?.totalDeals || 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="reports">Reports Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : users?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users?.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>{u.id}</TableCell>
                          <TableCell>{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${u.role === "admin" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                            >
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${u.isBanned ? "bg-destructive/20 text-destructive" : "bg-green-100 text-green-800"}`}
                            >
                              {u.isBanned ? "Banned" : "Active"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {u.role !== "admin" && (
                              <Button
                                variant={u.isBanned ? "outline" : "destructive"}
                                size="sm"
                                onClick={() => handleBanToggle(u.id, u.isBanned)}
                                disabled={banMutation.isPending}
                              >
                                {u.isBanned ? "Unban" : "Ban"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : reports?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No reports found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports?.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.id}</TableCell>
                          <TableCell className="font-semibold">{r.itemTitle}</TableCell>
                          <TableCell>
                            {r.sellerName}
                            <br />
                            <span className="text-xs text-muted-foreground">{r.sellerEmail}</span>
                          </TableCell>
                          <TableCell>
                            {r.reporterName}
                            <br />
                            <span className="text-xs text-muted-foreground">{r.reporterEmail}</span>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{r.reason}</span>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={r.description || ""}>
                            {r.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={r.status}
                              onValueChange={(val: any) =>
                                updateReportStatusMutation.mutate({
                                  reportId: r.id,
                                  status: val,
                                })
                              }
                              disabled={updateReportStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                <SelectItem value="DISMISSED">Dismissed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {r.sellerRole !== "admin" && (
                                <Button
                                  variant={r.sellerBanned ? "outline" : "destructive"}
                                  size="sm"
                                  onClick={() => handleBanToggle(r.sellerId, r.sellerBanned)}
                                  disabled={banMutation.isPending}
                                  className="h-8 text-xs"
                                >
                                  {r.sellerBanned ? "Unban Seller" : "Ban Seller"}
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteListing(r.itemId)}
                                disabled={deleteItemMutation.isPending}
                                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete Listing
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
