'use client';

import { getAuth } from 'firebase/auth';
import { SystemAlertsList } from '@/modules/system-alerts';

export default function SystemAlertsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">システムアラート</h1>
      <SystemAlertsList
        getIdToken={async () => (await getAuth().currentUser?.getIdToken()) ?? null}
        apiBasePath="/api/admin/system-alerts"
      />
    </div>
  );
}
