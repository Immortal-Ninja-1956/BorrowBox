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

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

export default function AdminDashboard() {
  usePageMetadata("Admin Dashboard", "BorrowBox administration panel.");
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
      refetchAuditLogs();
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

  const {
    data: auditLogs,
    isLoading: auditLogsLoading,
    refetch: refetchAuditLogs,
  } = trpc.admin.getAuditLogs.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const {
    data: rejections,
    isLoading: rejectionsLoading,
    refetch: refetchRejections,
  } = trpc.admin.getRejections.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateReportStatusMutation = trpc.admin.updateReportStatus.useMutation({
    onSuccess: () => {
      toast.success("Report status updated");
      refetchReports();
      refetchAuditLogs();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const approveRejectionMutation = trpc.admin.approveRejection.useMutation({
    onSuccess: () => {
      toast.success("False rejection approved and item created on marketplace!");
      refetchRejections();
      refetchAuditLogs();
      refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateRejectionStatusMutation = trpc.admin.updateRejectionStatus.useMutation({
    onSuccess: () => {
      toast.success("Rejection status updated");
      refetchRejections();
      refetchAuditLogs();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.admin.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Listing deleted successfully");
      refetchReports();
      refetchAuditLogs();
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
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="w-24 h-10 skeleton-shimmer rounded-lg" />
            ) : (
              <p className="text-4xl font-bold text-accent font-tabular">
                {stats?.totalUsers || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="w-24 h-10 skeleton-shimmer rounded-lg" />
            ) : (
              <p className="text-4xl font-bold text-accent font-tabular">
                {stats?.totalItems || 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Total Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="w-24 h-10 skeleton-shimmer rounded-lg" />
            ) : (
              <p className="text-4xl font-bold text-accent font-tabular">
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
          <TabsTrigger value="rejections">Rejections Queue</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
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

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target ID</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : auditLogs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No audit logs recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs?.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>{log.id}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{log.adminName}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">{log.adminEmail}</span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                log.action.includes("BAN")
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  : log.action.includes("DELETE")
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              }`}
                            >
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.targetId}</TableCell>
                          <TableCell>{log.details || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
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

        <TabsContent value="rejections">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Listing Info</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>GCV Confidence / Scores</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="animate-spin h-6 w-6 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : rejections?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          No rejected items in review queue.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rejections?.map(rej => {
                        let scoresObj: any = null;
                        try {
                          if (rej.confidenceScores) scoresObj = JSON.parse(rej.confidenceScores);
                        } catch (e) {}

                        return (
                          <TableRow key={rej.id}>
                            <TableCell>{rej.id}</TableCell>
                            <TableCell>
                              <span className="font-semibold">{rej.sellerName}</span>
                              <br />
                              <span className="text-xs text-muted-foreground">{rej.sellerEmail}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {rej.imageUrl && (
                                  <img
                                    src={rej.imageUrl}
                                    alt={rej.title}
                                    className="w-12 h-12 object-cover rounded border"
                                  />
                                )}
                                <div>
                                  <span className="font-semibold block">{rej.title}</span>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {rej.description || "No description"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs">
                              <span className="text-destructive font-medium block">{rej.reason}</span>
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                              {scoresObj ? (
                                <div className="space-y-1 text-xs">
                                  {scoresObj.flaggedKeyword && (
                                    <div className="font-mono text-red-600 bg-red-50 dark:bg-red-950/40 p-1 rounded">
                                      Flagged Keyword: <strong>{scoresObj.flaggedKeyword}</strong>
                                    </div>
                                  )}
                                  {scoresObj.topLabel && (
                                    <div className="text-muted-foreground">
                                      Top Label: <span className="font-semibold text-foreground">{scoresObj.topLabel.description}</span> ({scoresObj.topLabel.score})
                                    </div>
                                  )}
                                  {scoresObj.labels && scoresObj.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {scoresObj.labels.slice(0, 5).map((l: any, i: number) => (
                                        <span
                                          key={i}
                                          className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono"
                                        >
                                          {l.description} ({l.score})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No confidence scores</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  rej.status === "APPROVED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : rej.status === "DISMISSED"
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                }`}
                              >
                                {rej.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {rej.status === "PENDING" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => approveRejectionMutation.mutate({ rejectionId: rej.id })}
                                    disabled={approveRejectionMutation.isPending}
                                    className="h-8 text-xs border-green-600 text-green-600 hover:bg-green-50"
                                  >
                                    Approve Listing
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateRejectionStatusMutation.mutate({
                                        rejectionId: rej.id,
                                        status: "DISMISSED",
                                      })
                                    }
                                    disabled={updateRejectionStatusMutation.isPending}
                                    className="h-8 text-xs text-muted-foreground"
                                  >
                                    Dismiss
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
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
