import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetUsers } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminUsers() {
  const { data: usersData, isLoading } = useGetUsers({ limit: 100 });

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">View registered wholesale customers and admins.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : usersData?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-bold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{user.phone || '-'}</div>
                  <div className="text-muted-foreground truncate max-w-[200px]">{user.address || '-'}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(user.createdAt), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
