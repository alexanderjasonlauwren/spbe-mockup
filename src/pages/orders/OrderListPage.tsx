import { PageHeader } from "@/components/common/PageHeader";

export function OrderListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="View and manage customer orders."
      />
      <div className="text-gray-500">Order list will go here...</div>
    </div>
  );
}
