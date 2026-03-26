import { PageHeader } from "@/components/common/PageHeader";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your application settings."
      />
      <div className="text-gray-500">Settings will go here...</div>
    </div>
  );
}
