import { useAuthStore } from '../features/auth/authStore';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function OrgBadge() {
  const { userDisplayName, instanceUrl, orgName } = useAuthStore();

  if (!userDisplayName) return null;

  const domain = instanceUrl
    ? new URL(instanceUrl).hostname.replace('.my.salesforce.com', '').replace('.salesforce.com', '')
    : null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <BuildingOfficeIcon className="h-3.5 w-3.5 text-gray-400" />
      <span className="hidden sm:inline">{orgName || domain || 'Connected'}</span>
      <span className="text-gray-400">·</span>
      <span className="font-medium">{userDisplayName}</span>
    </div>
  );
}
