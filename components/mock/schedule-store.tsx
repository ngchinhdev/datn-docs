'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  tenantFixtures,
  type Appointment,
  type BonusTier,
  type Branch,
  type Customer,
  type MoneyState,
  type PackageProduct,
  type Requeue,
  type Resource,
  type ServedSubject,
  type Shift,
  type ShopConfig,
  type StaffTimeOff,
  type TemplatePolicies,
} from '@/mock/fixtures';
import { addAudits, type Actor, type AuditInput } from '@/mock/audit';
import type { World } from '@/mock/money-ops';

/** What Cài đặt saves in one go; a field left out stays as it is. */
export interface SettingsPatch {
  branch?: Branch;
  resources?: Resource[];
  policies?: TemplatePolicies;
  packageCatalog?: PackageProduct[];
  topupBonusTiers?: BonusTier[];
  config?: Partial<ShopConfig>;
}

/** The audit lines a save adds (BR-63). */
export interface SettingsLog {
  /** ISO 8601, UTC. */
  at: string;
  actor: Actor;
  entries: AuditInput[];
}

export interface ScheduleStore {
  appointments: Appointment[];
  /** Replaces one appointment by id. */
  replaceAppointment: (appt: Appointment) => void;
  /** Adds an appointment, or takes it away again (undo of a create). */
  addAppointment: (appt: Appointment) => void;
  removeAppointment: (id: string) => void;
  customers: Customer[];
  servedSubjects: ServedSubject[];
  /** A customer or pet made while creating an appointment; `remove*` is the undo. */
  addCustomer: (customer: Customer) => void;
  replaceCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;
  addSubject: (subject: ServedSubject) => void;
  replaceSubject: (subject: ServedSubject) => void;
  removeSubject: (id: string) => void;
  shifts: Shift[];
  setShifts: (shifts: Shift[]) => void;
  /** Leave requests; a technician's new one is pending until a manager decides (BR-11). */
  leaves: StaffTimeOff[];
  addLeaves: (leaves: StaffTimeOff[]) => void;
  replaceLeave: (leave: StaffTimeOff) => void;
  /** Appointments waiting for a new person after a shift was cut (BR-35). */
  requeues: Requeue[];
  addRequeues: (requeues: Requeue[]) => void;
  replaceRequeue: (requeue: Requeue) => void;
  removeRequeue: (id: string) => void;
  /** Technicians see customers' phone numbers (BR-36). */
  staffSeesCustomerPhone: boolean;
  setStaffSeesCustomerPhone: (value: boolean) => void;
  /** The tenant's booking policies (BR-06, BR-08, BR-09, BR-10); the customer pages read them. */
  policies: TemplatePolicies;
  setPolicies: (policies: TemplatePolicies) => void;
  /** Invoices, payments, wallet, refunds, commission of the tenant. */
  money: MoneyState;
  /** Replaces the money state; the pure functions of `mock/money-ops` build the next one. */
  setMoney: (next: MoneyState | ((prev: MoneyState) => MoneyState)) => void;
  /** One action that touches money, customers and appointments together (collect, refund). */
  applyWorld: (fn: (prev: World) => World) => void;
  /** The branch, its resources, the packages on sale, the bonus tiers and the rest of Cài đặt. */
  branch: Branch;
  resources: Resource[];
  packageCatalog: PackageProduct[];
  topupBonusTiers: BonusTier[];
  config: ShopConfig;
  /** Saves settings and adds their audit lines in one step; a change counts from now (BR-38). */
  saveSettings: (patch: SettingsPatch, log?: SettingsLog) => void;
}

interface TenantScheduleData {
  appointments: Appointment[];
  customers: Customer[];
  servedSubjects: ServedSubject[];
  shifts: Shift[];
  leaves: StaffTimeOff[];
  requeues: Requeue[];
  staffSeesCustomerPhone: boolean;
  policies: TemplatePolicies;
  money: MoneyState;
  branch: Branch;
  resources: Resource[];
  packageCatalog: PackageProduct[];
  topupBonusTiers: BonusTier[];
  config: ShopConfig;
}

interface ScheduleRootContextValue {
  tenants: Record<string, TenantScheduleData>;
  updateTenant: (
    tenantSlug: string,
    updater: (prev: TenantScheduleData) => TenantScheduleData,
  ) => void;
}

const ScheduleRootContext = createContext<ScheduleRootContextValue | null>(null);
const ScheduleContext = createContext<ScheduleStore | null>(null);

function initialTenantData(slug: string): TenantScheduleData {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === slug) ?? tenantFixtures[0]!;
  return {
    appointments: fixture.appointments,
    customers: fixture.customers,
    servedSubjects: fixture.servedSubjects,
    shifts: fixture.shifts,
    leaves: fixture.staffTimeOff,
    requeues: [],
    staffSeesCustomerPhone: fixture.staffSeesCustomerPhone,
    policies: fixture.policies,
    money: fixture.money,
    branch: fixture.branches[0]!,
    resources: fixture.resources,
    packageCatalog: fixture.packageCatalog,
    topupBonusTiers: fixture.topupBonusTiers,
    config: fixture.config,
  };
}

export function ScheduleRootProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Record<string, TenantScheduleData>>(() => {
    const init: Record<string, TenantScheduleData> = {};
    for (const f of tenantFixtures) {
      init[f.tenant.slug] = initialTenantData(f.tenant.slug);
    }
    return init;
  });

  const updateTenant = useCallback(
    (tenantSlug: string, updater: (prev: TenantScheduleData) => TenantScheduleData) => {
      setTenants((prev) => {
        const current = prev[tenantSlug] ?? initialTenantData(tenantSlug);
        return {
          ...prev,
          [tenantSlug]: updater(current),
        };
      });
    },
    [],
  );

  const value = useMemo(() => ({ tenants, updateTenant }), [tenants, updateTenant]);

  return <ScheduleRootContext.Provider value={value}>{children}</ScheduleRootContext.Provider>;
}

/**
 * The calendar of the tenant being viewed, so a change on one screen shows on every other: nothing
 * is saved, a reload starts from the sample data again.
 */
export function ScheduleStoreProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const root = useContext(ScheduleRootContext);

  // Fallback local state if ScheduleRootProvider is not present above
  const [localData, setLocalData] = useState<TenantScheduleData>(() =>
    initialTenantData(tenantSlug),
  );

  const data = root ? (root.tenants[tenantSlug] ?? initialTenantData(tenantSlug)) : localData;

  const update = useCallback(
    (updater: (prev: TenantScheduleData) => TenantScheduleData) => {
      if (root) {
        root.updateTenant(tenantSlug, updater);
      } else {
        setLocalData(updater);
      }
    },
    [root, tenantSlug],
  );

  const replaceAppointment = useCallback(
    (appt: Appointment) => {
      update((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === appt.id ? appt : a)),
      }));
    },
    [update],
  );

  const addAppointment = useCallback(
    (appt: Appointment) => {
      update((prev) => ({
        ...prev,
        appointments: [...prev.appointments, appt],
      }));
    },
    [update],
  );

  const removeAppointment = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        appointments: prev.appointments.filter((a) => a.id !== id),
      }));
    },
    [update],
  );

  const addCustomer = useCallback(
    (customer: Customer) => {
      update((prev) => ({
        ...prev,
        customers: [...prev.customers, customer],
      }));
    },
    [update],
  );

  const replaceCustomer = useCallback(
    (customer: Customer) => {
      update((prev) => ({
        ...prev,
        customers: prev.customers.map((c) => (c.id === customer.id ? customer : c)),
      }));
    },
    [update],
  );

  const removeCustomer = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== id),
      }));
    },
    [update],
  );

  const addSubject = useCallback(
    (subject: ServedSubject) => {
      update((prev) => ({
        ...prev,
        servedSubjects: [...prev.servedSubjects, subject],
      }));
    },
    [update],
  );

  const replaceSubject = useCallback(
    (subject: ServedSubject) => {
      update((prev) => ({
        ...prev,
        servedSubjects: prev.servedSubjects.map((s) => (s.id === subject.id ? subject : s)),
      }));
    },
    [update],
  );

  const removeSubject = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        servedSubjects: prev.servedSubjects.filter((s) => s.id !== id),
      }));
    },
    [update],
  );

  const setShifts = useCallback(
    (shifts: Shift[]) => {
      update((prev) => ({ ...prev, shifts }));
    },
    [update],
  );

  const addLeaves = useCallback(
    (added: StaffTimeOff[]) => {
      update((prev) => ({ ...prev, leaves: [...prev.leaves, ...added] }));
    },
    [update],
  );

  const replaceLeave = useCallback(
    (leave: StaffTimeOff) => {
      update((prev) => ({
        ...prev,
        leaves: prev.leaves.map((l) => (l.id === leave.id ? leave : l)),
      }));
    },
    [update],
  );

  const addRequeues = useCallback(
    (added: Requeue[]) => {
      update((prev) => ({ ...prev, requeues: [...prev.requeues, ...added] }));
    },
    [update],
  );

  const replaceRequeue = useCallback(
    (requeue: Requeue) => {
      update((prev) => ({
        ...prev,
        requeues: prev.requeues.map((r) => (r.id === requeue.id ? requeue : r)),
      }));
    },
    [update],
  );

  const removeRequeue = useCallback(
    (id: string) => {
      update((prev) => ({
        ...prev,
        requeues: prev.requeues.filter((r) => r.id !== id),
      }));
    },
    [update],
  );

  const setStaffSeesCustomerPhone = useCallback(
    (value: boolean) => {
      update((prev) => ({ ...prev, staffSeesCustomerPhone: value }));
    },
    [update],
  );

  const setPolicies = useCallback(
    (policies: TemplatePolicies) => {
      update((prev) => ({ ...prev, policies }));
    },
    [update],
  );

  const setMoney = useCallback(
    (next: MoneyState | ((prev: MoneyState) => MoneyState)) => {
      update((prev) => ({
        ...prev,
        money: typeof next === 'function' ? next(prev.money) : next,
      }));
    },
    [update],
  );

  const applyWorld = useCallback(
    (fn: (prev: World) => World) => {
      update((prev) => {
        const next = fn({
          money: prev.money,
          customers: prev.customers,
          appointments: prev.appointments,
        });
        return {
          ...prev,
          money: next.money,
          customers: next.customers,
          appointments: next.appointments,
        };
      });
    },
    [update],
  );

  const saveSettings = useCallback(
    (patch: SettingsPatch, log?: SettingsLog) => {
      update((prev) => ({
        ...prev,
        ...(patch.branch ? { branch: patch.branch } : {}),
        ...(patch.resources ? { resources: patch.resources } : {}),
        ...(patch.policies ? { policies: patch.policies } : {}),
        ...(patch.packageCatalog ? { packageCatalog: patch.packageCatalog } : {}),
        ...(patch.topupBonusTiers ? { topupBonusTiers: patch.topupBonusTiers } : {}),
        ...(patch.config ? { config: { ...prev.config, ...patch.config } } : {}),
        ...(log
          ? {
              money: {
                ...prev.money,
                audit: addAudits(prev.money.audit, log.at, log.actor, log.entries),
              },
            }
          : {}),
      }));
    },
    [update],
  );

  const value = useMemo(
    () => ({
      appointments: data.appointments,
      replaceAppointment,
      addAppointment,
      removeAppointment,
      customers: data.customers,
      servedSubjects: data.servedSubjects,
      addCustomer,
      replaceCustomer,
      removeCustomer,
      addSubject,
      replaceSubject,
      removeSubject,
      shifts: data.shifts,
      setShifts,
      leaves: data.leaves,
      addLeaves,
      replaceLeave,
      requeues: data.requeues,
      addRequeues,
      replaceRequeue,
      removeRequeue,
      staffSeesCustomerPhone: data.staffSeesCustomerPhone,
      setStaffSeesCustomerPhone,
      policies: data.policies,
      setPolicies,
      money: data.money,
      setMoney,
      applyWorld,
      branch: data.branch,
      resources: data.resources,
      packageCatalog: data.packageCatalog,
      topupBonusTiers: data.topupBonusTiers,
      config: data.config,
      saveSettings,
    }),
    [
      data,
      replaceAppointment,
      addAppointment,
      removeAppointment,
      addCustomer,
      replaceCustomer,
      removeCustomer,
      addSubject,
      replaceSubject,
      removeSubject,
      setShifts,
      addLeaves,
      replaceLeave,
      addRequeues,
      replaceRequeue,
      removeRequeue,
      setStaffSeesCustomerPhone,
      setPolicies,
      setMoney,
      applyWorld,
      saveSettings,
    ],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

/** The data of every tenant, for a page outside the app that has to change one (accepting an invitation). */
export function useScheduleRoot(): ScheduleRootContextValue {
  const root = useContext(ScheduleRootContext);
  if (!root) throw new Error('useScheduleRoot() needs <ScheduleRootProvider>');
  return root;
}

export function useScheduleStore() {
  const store = useContext(ScheduleContext);
  if (!store) throw new Error('useScheduleStore() needs <ScheduleStoreProvider>');
  return store;
}
