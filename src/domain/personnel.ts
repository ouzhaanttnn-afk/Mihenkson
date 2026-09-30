import type { PersonnelRole, ServiceJob, StoreState } from './types';
import { personnelCount } from './v5-rules';

export const PERSONNEL_ACTION_SECONDS = 90;
export const PERSONNEL_ROLE_LABELS: Record<PersonnelRole, string> = {
  idle: 'Bekleme desteği', reception: 'Karşılama', sales: 'Güvenli satış', workshop: 'Atölye ustası',
};

export function personnelRoles(store: StoreState): PersonnelRole[] {
  return Array.from({ length: personnelCount(store) }, (_, index) => {
    const role = store.personnelRoles?.[index];
    return role && Object.hasOwn(PERSONNEL_ROLE_LABELS, role) ? role : 'idle';
  });
}

export function availableWorkshopStaff(store: StoreState, jobs: ServiceJob[] = []): string[] {
  const busy = new Set(jobs.filter(job => job.result === 'pending').map(job => job.assignedStaff));
  return personnelRoles(store).flatMap((role, index) => {
    const id = `personnel_${index + 1}`;
    return role === 'workshop' && !busy.has(id) ? [id] : [];
  });
}
