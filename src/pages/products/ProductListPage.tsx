import { PageHeader } from "@/components/common/pageHeader";

export function ProductListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product inventory."
      />
      <div className="text-gray-500">Product list will go here...</div>
    </div>
  );
}
