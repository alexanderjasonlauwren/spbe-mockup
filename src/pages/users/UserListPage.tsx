import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function UserListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage your users and their permissions."
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />
      <div className="text-gray-500">User list will go here...</div>
    </div>
  );
}
