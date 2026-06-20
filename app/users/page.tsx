import { UserManagement } from "../../components/user-management";
import { auditEvents, managedUsers, tenants } from "../../lib/users";

export default function UsersPage() {
  return <UserManagement auditEvents={auditEvents} initialUsers={managedUsers} tenants={tenants} />;
}
