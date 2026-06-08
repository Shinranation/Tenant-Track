import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  DoorOpen,
  FileDown,
  Printer,
  X,
} from 'lucide-react';
import BuildingCard from './components/BuildingCard.jsx';
import DashboardStats from './components/DashboardStats.jsx';
import StatusLegend from './components/StatusLegend.jsx';
import { supabase } from './lib/supabaseClient.js';

function getPaymentForBillingPeriod(payments, billingPeriod) {
  return payments.find(
    (payment) =>
      payment.billing_month === billingPeriod.month && payment.billing_year === billingPeriod.year,
  );
}

function formatBillingDate(billingPeriod, day) {
  const numericDay = Number(day);

  if (!Number.isFinite(numericDay) || numericDay < 1) {
    return '';
  }

  const daysInMonth = new Date(billingPeriod.year, billingPeriod.month, 0).getDate();
  const billingDay = Math.min(Math.trunc(numericDay), daysInMonth);
  const month = String(billingPeriod.month).padStart(2, '0');
  const date = String(billingDay).padStart(2, '0');

  return `${billingPeriod.year}-${month}-${date}`;
}

function getDayFromDate(date) {
  if (!date) {
    return '';
  }

  return Number(date.split('-')[2]);
}

function getRecurringDueDate(payments, billingPeriod, fallbackDay = '') {
  const currentPayment = getPaymentForBillingPeriod(payments, billingPeriod);

  if (currentPayment?.due_date) {
    return currentPayment.due_date;
  }

  const paymentWithDueDate = payments
    .filter((payment) => payment.due_date)
    .sort(
      (left, right) =>
        right.billing_year - left.billing_year || right.billing_month - left.billing_month,
    )[0];
  const recurringDay = getDayFromDate(paymentWithDueDate?.due_date) || fallbackDay;

  return formatBillingDate(billingPeriod, recurringDay);
}

function getRecurringAmount(payments, billingPeriod) {
  const currentPayment = getPaymentForBillingPeriod(payments, billingPeriod);

  if (currentPayment?.amount_due != null) {
    return currentPayment.amount_due;
  }

  const paymentWithAmount = payments
    .filter((payment) => payment.amount_due != null)
    .sort(
      (left, right) =>
        right.billing_year - left.billing_year || right.billing_month - left.billing_month,
    )[0];

  return paymentWithAmount?.amount_due ?? '';
}

function getPaymentStatus(activeContract, payments, utilityType) {
  if (!activeContract) {
    return 'vacant';
  }

  const filteredPayments = utilityType
    ? payments.filter((payment) => payment.utility_type === utilityType)
    : payments;

  return filteredPayments[0]?.status ?? 'upcoming';
}

function getRoomDisplayOrder(room) {
  const paymentStatuses = Object.values(room.payments ?? {});
  const hasActivePayments = paymentStatuses.some((status) => status !== 'vacant');

  if (room.status === 'occupied') {
    return 0;
  }

  if (room.status === 'unavailable') {
    return 2;
  }

  if (room.tenant || room.contractId || hasActivePayments) {
    return 0;
  }

  return 1;
}

function sortRoomsForDisplay(roomA, roomB) {
  return (
    getRoomDisplayOrder(roomA) - getRoomDisplayOrder(roomB) ||
    roomA.number.localeCompare(roomB.number, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

function buildProperties({
  buildings,
  rooms,
  tenants,
  contracts,
  rentPayments,
  utilityPayments,
  billingPeriod,
}) {
  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    address: building.address,
    rooms: rooms
      .filter((room) => room.building_id === building.id)
      .map((room) => {
        const activeContract = contracts.find(
          (contract) => contract.room_id === room.id && contract.status === 'active',
        );
        const activeRentPayments = rentPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const activeUtilityPayments = utilityPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const latestRentPayment = getPaymentForBillingPeriod(activeRentPayments, billingPeriod);
        const latestWaterPayment = getPaymentForBillingPeriod(
          activeUtilityPayments.filter((payment) => payment.utility_type === 'water'),
          billingPeriod,
        );
        const latestLightPayment = getPaymentForBillingPeriod(
          activeUtilityPayments.filter((payment) => payment.utility_type === 'electricity'),
          billingPeriod,
        );
        const waterPayments = activeUtilityPayments.filter(
          (payment) => payment.utility_type === 'water',
        );
        const lightPayments = activeUtilityPayments.filter(
          (payment) => payment.utility_type === 'electricity',
        );
        const tenant = tenants.find((tenantRecord) => tenantRecord.id === activeContract?.tenant_id);
        const nestedTenant = Array.isArray(activeContract?.tenants)
          ? activeContract.tenants[0]
          : activeContract?.tenants;
        const tenantName = tenant?.full_name ?? nestedTenant?.full_name ?? null;

        return {
          id: room.id,
          number: room.room_name,
          buildingName: building.name,
          contractId: activeContract?.id ?? null,
          tenantId: activeContract?.tenant_id ?? null,
          rentPaymentId: latestRentPayment?.id ?? null,
          waterPaymentId: latestWaterPayment?.id ?? null,
          lightPaymentId: latestLightPayment?.id ?? null,
          tenant: tenantName,
          movedIn: activeContract?.start_date ?? '',
          contractEnds: activeContract?.end_date ?? '',
          dueDay: activeContract?.due_day ?? '',
          monthlyRent: room.monthly_rent,
          rentAmount: latestRentPayment?.amount_due ?? room.monthly_rent ?? '',
          rentPaid: latestRentPayment?.amount_paid ?? '',
          rentStatus:
            latestRentPayment?.status ??
            getPaymentStatus(activeContract, latestRentPayment ? [latestRentPayment] : []),
          rentDueDate: getRecurringDueDate(
            activeRentPayments,
            billingPeriod,
            activeContract?.due_day,
          ),
          waterAmount: getRecurringAmount(waterPayments, billingPeriod),
          waterPaid: latestWaterPayment?.amount_paid ?? '',
          waterStatus:
            latestWaterPayment?.status ??
            getPaymentStatus(activeContract, latestWaterPayment ? [latestWaterPayment] : []),
          waterDueDate: getRecurringDueDate(waterPayments, billingPeriod),
          lightAmount: getRecurringAmount(lightPayments, billingPeriod),
          lightPaid: latestLightPayment?.amount_paid ?? '',
          lightStatus:
            latestLightPayment?.status ??
            getPaymentStatus(activeContract, latestLightPayment ? [latestLightPayment] : []),
          lightDueDate: getRecurringDueDate(lightPayments, billingPeriod),
          status: room.status,
          payments: {
            rent: getPaymentStatus(activeContract, latestRentPayment ? [latestRentPayment] : []),
            light: getPaymentStatus(activeContract, latestLightPayment ? [latestLightPayment] : []),
            water: getPaymentStatus(activeContract, latestWaterPayment ? [latestWaterPayment] : []),
          },
        };
      })
      .sort(sortRoomsForDisplay),
  }));
}

const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthlyNotesStorageKey = 'tenanttrack.monthlyNotes.v1';
const emptyPortfolioRecords = {
  buildings: [],
  rooms: [],
  tenants: [],
  contracts: [],
  rentPayments: [],
  utilityPayments: [],
};
const moneyChangeConfirmation = 'yes I am sure';
const moneyFields = [
  ['Rent Amount', 'rentAmount'],
  ['Rent Paid', 'rentPaid'],
  ['Water Amount', 'waterAmount'],
  ['Water Paid', 'waterPaid'],
  ['Lights Amount', 'lightAmount'],
  ['Lights Paid', 'lightPaid'],
];
const removePaidConfirmation = moneyChangeConfirmation;
const paymentHistoryTable = 'payment_history_logs';
const paymentTypes = [
  {
    key: 'rent',
    label: 'Rent',
    paymentIdKey: 'rentPaymentId',
    paymentTable: 'rent_payments',
  },
  {
    key: 'water',
    label: 'Water',
    paymentIdKey: 'waterPaymentId',
    paymentTable: 'utility_payments',
    utilityType: 'water',
  },
  {
    key: 'light',
    label: 'Lights',
    paymentIdKey: 'lightPaymentId',
    paymentTable: 'utility_payments',
    utilityType: 'electricity',
  },
];

function loadMonthlyNotes() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(monthlyNotesStorageKey)) ?? {};
  } catch {
    return {};
  }
}

function getMonthlyNoteKey(scope, id, billingPeriod) {
  return `${billingPeriod.year}-${String(billingPeriod.month).padStart(2, '0')}:${scope}:${id}`;
}

function hasNoteValue(value) {
  return value != null && String(value).trim() !== '';
}

function hasMonthlyRoomNote(notes, billingPeriod, roomId) {
  return hasNoteValue(notes[getMonthlyNoteKey('room', roomId, billingPeriod)]);
}

function getMonthlyNoteCount(notes, billingPeriod, properties) {
  return properties.reduce((total, property) => {
    const buildingNoteCount = hasNoteValue(
      notes[getMonthlyNoteKey('building', property.id, billingPeriod)],
    )
      ? 1
      : 0;
    const roomNoteCount = property.rooms.filter((room) =>
      hasMonthlyRoomNote(notes, billingPeriod, room.id),
    ).length;

    return total + buildingNoteCount + roomNoteCount;
  }, 0);
}

function getTenantName(contract, tenants) {
  const tenant = tenants.find((tenantRecord) => tenantRecord.id === contract?.tenant_id);
  const nestedTenant = Array.isArray(contract?.tenants) ? contract.tenants[0] : contract?.tenants;

  return tenant?.full_name ?? nestedTenant?.full_name ?? '';
}

function getPaidAmount(payment) {
  const amount = Number(payment?.amount_paid);

  return Number.isFinite(amount) ? amount : 0;
}

function isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod) {
  if (payment.billing_year !== billingPeriod.year) {
    return false;
  }

  return summaryPeriod === 'year' || payment.billing_month === billingPeriod.month;
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getReceiptExportTitle(billingPeriod, summaryPeriod) {
  const periodSlug =
    summaryPeriod === 'year'
      ? billingPeriod.year
      : `${billingPeriod.year}-${String(billingPeriod.month).padStart(2, '0')}`;

  return `TenantTrack Receipt ${periodSlug}`;
}

function formatHistoryDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizeAmount(value) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function getMoneyChanges(room, formData) {
  return moneyFields
    .map(([label, key]) => {
      const previousAmount = normalizeAmount(room[key]);
      const nextAmount = normalizeAmount(formData[key]);

      return previousAmount === nextAmount
        ? null
        : {
            key,
            label,
            previousAmount,
            nextAmount,
          };
    })
    .filter(Boolean);
}

function hasPaymentHistoryChange(room, formData, paymentType) {
  const previousPaid = normalizeAmount(room[`${paymentType.key}Paid`]);
  const nextPaid = normalizeAmount(formData[`${paymentType.key}Paid`]);
  const previousStatus = room[`${paymentType.key}Status`] ?? room.payments[paymentType.key] ?? 'upcoming';
  const nextStatus = formData[`${paymentType.key}Status`] ?? 'upcoming';

  return previousPaid !== nextPaid || previousStatus !== nextStatus;
}

function buildPaymentHistoryRows({ room, formData, userEmail, activeContractId }) {
  return paymentTypes
    .filter((paymentType) => hasPaymentHistoryChange(room, formData, paymentType))
    .map((paymentType) => ({
      room_id: room.id,
      contract_id: activeContractId,
      payment_table: paymentType.paymentTable,
      payment_id: room[paymentType.paymentIdKey],
      payment_type: paymentType.key,
      utility_type: paymentType.utilityType ?? null,
      billing_month: room.billingMonth,
      billing_year: room.billingYear,
      old_amount_paid: normalizeAmount(room[`${paymentType.key}Paid`]),
      new_amount_paid: normalizeAmount(formData[`${paymentType.key}Paid`]),
      old_status: room[`${paymentType.key}Status`] ?? room.payments[paymentType.key] ?? 'upcoming',
      new_status: formData[`${paymentType.key}Status`] ?? 'upcoming',
      changed_by: userEmail ?? 'Unknown user',
    }));
}

function getPaymentTypeLabel(paymentType) {
  return paymentTypes.find((type) => type.key === paymentType)?.label ?? paymentType;
}

function getPaymentHistoryErrorMessage(error) {
  if (error?.code === '42P01') {
    return 'Payment history table missing. Run payment_history_logs.sql in Supabase.';
  }

  if (
    error?.code === '42501' ||
    error?.message?.toLowerCase().includes('row-level security') ||
    error?.message?.toLowerCase().includes('permission denied')
  ) {
    return 'Payment history access blocked. Run the payment_history_logs.sql policies in Supabase.';
  }

  return 'Payment history setup needed. Run payment_history_logs.sql in Supabase.';
}

function getPaymentHistorySaveErrorMessage(error) {
  if (error?.code === '42P01') {
    return 'Payment saved, but the history table is missing. Run payment_history_logs.sql in Supabase.';
  }

  if (
    error?.code === '42501' ||
    error?.message?.toLowerCase().includes('row-level security') ||
    error?.message?.toLowerCase().includes('permission denied')
  ) {
    return 'Payment saved, but history access is blocked. Run the payment_history_logs.sql policies in Supabase.';
  }

  return 'Payment saved, but history setup is still needed. Run payment_history_logs.sql in Supabase.';
}

function getSummaryNoteText(notes, billingPeriod, summaryPeriod, buildingId, roomId) {
  const monthRange =
    summaryPeriod === 'year'
      ? monthOptions.map((_, index) => index + 1)
      : [billingPeriod.month];

  return monthRange
    .flatMap((month) => {
      const notePeriod = {
        month,
        year: billingPeriod.year,
      };
      const monthLabel = summaryPeriod === 'year' ? `${monthOptions[month - 1].slice(0, 3)}: ` : '';
      const buildingNote = notes[getMonthlyNoteKey('building', buildingId, notePeriod)];
      const roomNote = notes[getMonthlyNoteKey('room', roomId, notePeriod)];

      return [
        hasNoteValue(buildingNote) ? `${monthLabel}Building - ${buildingNote.trim()}` : '',
        hasNoteValue(roomNote) ? `${monthLabel}Room - ${roomNote.trim()}` : '',
      ];
    })
    .filter(Boolean)
    .join('\n');
}

function buildSummaryRows(portfolioRecords, billingPeriod, summaryPeriod, notes) {
  return portfolioRecords.rooms.map((room) => {
    const building = portfolioRecords.buildings.find(
      (buildingRecord) => buildingRecord.id === room.building_id,
    );
    const roomContracts = portfolioRecords.contracts.filter((contract) => contract.room_id === room.id);
    const contractIds = new Set(roomContracts.map((contract) => contract.id));
    const activeContract = roomContracts.find((contract) => contract.status === 'active');
    const tenantName =
      getTenantName(activeContract, portfolioRecords.tenants) ||
      roomContracts
        .map((contract) => getTenantName(contract, portfolioRecords.tenants))
        .find((name) => name) ||
      'Vacant';
    const rentPaid = portfolioRecords.rentPayments
      .filter(
        (payment) =>
          contractIds.has(payment.contract_id) &&
          isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod),
      )
      .reduce((total, payment) => total + getPaidAmount(payment), 0);
    const utilityPayments = portfolioRecords.utilityPayments.filter(
      (payment) =>
        contractIds.has(payment.contract_id) &&
        isPaymentInSummaryPeriod(payment, billingPeriod, summaryPeriod),
    );
    const waterPaid = utilityPayments
      .filter((payment) => payment.utility_type === 'water')
      .reduce((total, payment) => total + getPaidAmount(payment), 0);
    const lightPaid = utilityPayments
      .filter((payment) => payment.utility_type === 'electricity')
      .reduce((total, payment) => total + getPaidAmount(payment), 0);

    return {
      id: room.id,
      buildingId: building?.id ?? 'unassigned',
      buildingName: building?.name ?? 'Unassigned',
      buildingAddress: building?.address ?? '',
      roomName: room.room_name,
      tenantName,
      rentPaid,
      waterPaid,
      lightPaid,
      totalPaid: rentPaid + waterPaid + lightPaid,
      notes: getSummaryNoteText(notes, billingPeriod, summaryPeriod, building?.id, room.id),
    };
  });
}

function groupRowsByBuilding(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const groupId = row.buildingId ?? row.buildingName;
    const currentGroup = groups.get(groupId) ?? {
      id: groupId,
      name: row.buildingName,
      address: row.buildingAddress,
      rows: [],
      rentPaid: 0,
      waterPaid: 0,
      lightPaid: 0,
      totalPaid: 0,
    };

    currentGroup.rows.push(row);
    currentGroup.rentPaid += row.rentPaid;
    currentGroup.waterPaid += row.waterPaid;
    currentGroup.lightPaid += row.lightPaid;
    currentGroup.totalPaid += row.totalPaid;
    groups.set(groupId, currentGroup);
  });

  return Array.from(groups.values());
}

function App() {
  const currentDate = new Date();
  const [billingPeriod, setBillingPeriod] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState('checking');
  const [properties, setProperties] = useState([]);
  const [portfolioRecords, setPortfolioRecords] = useState(emptyPortfolioRecords);
  const [activePage, setActivePage] = useState('dashboard');
  const [summaryPeriod, setSummaryPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [monthlyNotes, setMonthlyNotes] = useState(loadMonthlyNotes);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Add your Supabase URL and anon key to .env to load property data.');
      setIsLoading(false);
      return false;
    }

    if (!session || accessStatus !== 'allowed') {
      setProperties([]);
      setPortfolioRecords(emptyPortfolioRecords);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    setErrorMessage('');

    const [
      buildingsResult,
      roomsResult,
      tenantsResult,
      contractsResult,
      rentPaymentsResult,
      utilityPaymentsResult,
    ] = await Promise.all([
      supabase.from('buildings').select('id, name, address').order('created_at'),
      supabase
        .from('rooms')
        .select('id, building_id, room_name, monthly_rent, status')
        .order('created_at'),
      supabase.from('tenants').select('id, full_name'),
      supabase
        .from('lease_contracts')
        .select('id, tenant_id, room_id, start_date, end_date, due_day, status, tenants(full_name)'),
      supabase
        .from('rent_payments')
        .select(
          'id, contract_id, billing_month, billing_year, amount_due, amount_paid, due_date, status',
        ),
      supabase
        .from('utility_payments')
        .select(
          'id, contract_id, utility_type, billing_month, billing_year, amount_due, amount_paid, due_date, status',
        ),
    ]);

    const requestError =
      buildingsResult.error ||
      roomsResult.error ||
      tenantsResult.error ||
      contractsResult.error ||
      rentPaymentsResult.error ||
      utilityPaymentsResult.error;

    if (requestError) {
      setErrorMessage(requestError.message);
      setIsLoading(false);
      return false;
    }

    const records = {
      buildings: buildingsResult.data ?? [],
      rooms: roomsResult.data ?? [],
      tenants: tenantsResult.data ?? [],
      contracts: contractsResult.data ?? [],
      rentPayments: rentPaymentsResult.data ?? [],
      utilityPayments: utilityPaymentsResult.data ?? [],
    };

    setPortfolioRecords(records);
    setProperties(
      buildProperties({
        ...records,
        billingPeriod,
      }),
    );
    setIsLoading(false);
    return true;
  }, [accessStatus, billingPeriod, session]);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      setAccessStatus('denied');
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccessStatus('checking');
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAllowedUser() {
      if (!supabase || !session) {
        setAccessStatus('denied');
        return;
      }

      const email = session.user?.email;

      if (!email) {
        setAccessStatus('denied');
        return;
      }

      setAccessStatus('checking');

      const { data, error } = await supabase
        .from('allowed_users')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setAccessStatus(!error && data ? 'allowed' : 'denied');
    }

    checkAllowedUser();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rooms = useMemo(() => properties.flatMap((property) => property.rooms), [properties]);

  const dashboardStats = useMemo(
    () => [
      {
        label: 'Buildings',
        value: properties.length,
        icon: Building2,
      },
      {
        label: 'Rooms',
        value: rooms.length,
        icon: DoorOpen,
      },
      {
        label: 'Rooms Fully Paid',
        value: rooms.filter(
          (room) =>
            room.tenant && Object.values(room.payments).every((status) => status === 'paid'),
        ).length,
        icon: CheckCircle2,
      },
      {
        label: 'Rooms Unavailable',
        value: rooms.filter((room) => !room.tenant || room.status === 'unavailable').length,
        icon: Ban,
      },
      {
        label: 'Rooms Overdue',
        value: rooms.filter((room) => Object.values(room.payments).includes('overdue')).length,
        icon: AlertTriangle,
      },
    ],
    [properties.length, rooms],
  );
  const monthlyNoteCount = useMemo(
    () => getMonthlyNoteCount(monthlyNotes, billingPeriod, properties),
    [billingPeriod, monthlyNotes, properties],
  );
  const summaryRows = useMemo(
    () => buildSummaryRows(portfolioRecords, billingPeriod, summaryPeriod, monthlyNotes),
    [billingPeriod, monthlyNotes, portfolioRecords, summaryPeriod],
  );

  useEffect(() => {
    window.localStorage.setItem(monthlyNotesStorageKey, JSON.stringify(monthlyNotes));
  }, [monthlyNotes]);

  function handleMonthlyNoteChange(noteKey, value) {
    setMonthlyNotes((current) => ({
      ...current,
      [noteKey]: value,
    }));
  }

  function handleReceiptPdfExport() {
    if (typeof window === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    document.title = getReceiptExportTitle(billingPeriod, summaryPeriod);
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 750);
  }

  function handleReceiptPrint() {
    window.print();
  }

  if (isAuthLoading) {
    return (
      <main className="app-shell">
        <p className="system-message">Checking login...</p>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (accessStatus === 'checking') {
    return (
      <main className="app-shell">
        <p className="system-message">Checking approved user...</p>
      </main>
    );
  }

  if (accessStatus === 'denied') {
    return <AccessDeniedScreen email={session.user?.email} />;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-strip">
          <h1>TenantTrack</h1>
          <button
            className="page-switch-button"
            type="button"
            onClick={() =>
              setActivePage((current) => (current === 'summary' ? 'dashboard' : 'summary'))
            }
          >
            {activePage === 'summary' ? 'Dashboard' : 'Summary'}
          </button>
        </div>
        <button className="logout-button" type="button" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </header>

      {activePage === 'dashboard' ? (
        <>
          <section className="summary-band" aria-label="Portfolio details">
            <DashboardStats items={dashboardStats} />
          </section>

          <section className="dashboard-layout">
            <aside className="month-panel" aria-label="Billing month selector">
              <div className="month-panel__title">{billingPeriod.year}</div>
              <div className="month-panel__buttons">
                {monthOptions.map((monthName, index) => {
                  const month = index + 1;

                  return (
                    <button
                      className={`month-button${billingPeriod.month === month ? ' month-button--active' : ''}`}
                      type="button"
                      key={monthName}
                      onClick={() => setBillingPeriod((current) => ({ ...current, month }))}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="workspace">
              <div className="workspace-header">
                <StatusLegend />
              </div>

              {isLoading && <p className="system-message">Loading property data...</p>}
              {errorMessage && <p className="system-message system-message--error">{errorMessage}</p>}
              {!isLoading && !errorMessage && properties.length === 0 && (
                <p className="system-message">No buildings found in Supabase yet.</p>
              )}

              {!isLoading && !errorMessage && properties.length > 0 && (
                <div className="building-grid">
                  {properties.map((property) => (
                    <BuildingCard
                      key={property.id}
                      hasRoomNote={(roomId) => hasMonthlyRoomNote(monthlyNotes, billingPeriod, roomId)}
                      property={property}
                      onEditRoom={(room) =>
                        setEditingRoom({
                          ...room,
                          billingMonth: billingPeriod.month,
                          billingYear: billingPeriod.year,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          </section>

          {!isLoading && !errorMessage && properties.length > 0 && (
            <MonthlyNotesPanel
              billingPeriod={billingPeriod}
              isOpen={isNotesOpen}
              noteCount={monthlyNoteCount}
              notes={monthlyNotes}
              onNoteChange={handleMonthlyNoteChange}
              onToggle={() => setIsNotesOpen((current) => !current)}
              properties={properties}
            />
          )}
        </>
      ) : (
        <SummaryPage
          billingPeriod={billingPeriod}
          isLoading={isLoading}
          rows={summaryRows}
          summaryPeriod={summaryPeriod}
          onBillingPeriodChange={setBillingPeriod}
          onExportPdf={handleReceiptPdfExport}
          onPrint={handleReceiptPrint}
          onSummaryPeriodChange={setSummaryPeriod}
        />
      )}

      {editingRoom && (
        <EditRoomWindow
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={loadDashboard}
          userEmail={session.user?.email}
        />
      )}

      <footer>Designed and Created by: Jayrad P. Adeva</footer>
    </main>
  );
}

function MonthlyNotesPanel({
  billingPeriod,
  isOpen,
  noteCount,
  notes,
  onNoteChange,
  onToggle,
  properties,
}) {
  return (
    <section
      className={`monthly-notes${isOpen ? ' monthly-notes--open' : ''}`}
      aria-label="Monthly short-term agreement notes"
    >
      <button
        className="monthly-notes__toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>Notes - {monthOptions[billingPeriod.month - 1]} {billingPeriod.year}</span>
        <span className="monthly-notes__count">
          {noteCount} saved {noteCount === 1 ? 'note' : 'notes'}
        </span>
        <ChevronDown size={18} />
      </button>

      {isOpen && (
        <div className="monthly-notes__grid">
          {properties.map((property) => (
            <article className="monthly-notes__building" key={property.id}>
              <label className="note-field note-field--building">
                <span>{property.name}</span>
                <textarea
                  value={notes[getMonthlyNoteKey('building', property.id, billingPeriod)] ?? ''}
                  placeholder="Building note"
                  onChange={(event) =>
                    onNoteChange(
                      getMonthlyNoteKey('building', property.id, billingPeriod),
                      event.target.value,
                    )
                  }
                />
              </label>

              <div className="room-note-list">
                {property.rooms.map((room) => (
                  <label className="note-field" key={room.id}>
                    <span>{room.number}</span>
                    <textarea
                      value={notes[getMonthlyNoteKey('room', room.id, billingPeriod)] ?? ''}
                      placeholder="Room agreement note"
                      onChange={(event) =>
                        onNoteChange(
                          getMonthlyNoteKey('room', room.id, billingPeriod),
                          event.target.value,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LoginScreen() {
  const [authMessage, setAuthMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    if (!supabase) {
      setAuthMessage('Add Supabase environment variables before logging in.');
      return;
    }

    setIsSubmitting(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-window" aria-label="TenantTrack login">
        <div className="login-window__tab">TenantTrack Login</div>
        <div className="login-content">
          <p className="login-note">Use your allowed Google account to open TenantTrack.</p>

          {authMessage && <p className="login-message">{authMessage}</p>}

          <button
            className="login-button login-button--google"
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
          >
            <span className="login-google-mark" aria-hidden="true">G</span>
            {isSubmitting ? 'Opening Google...' : 'Login with Google'}
          </button>
        </div>
      </section>
    </main>
  );
}

function AccessDeniedScreen({ email }) {
  return (
    <main className="login-shell">
      <section className="login-window" aria-label="TenantTrack access denied">
        <div className="login-window__tab">Access Denied</div>
        <div className="login-content">
          <p className="login-note">
            This Google account is signed in, but it is not approved for TenantTrack.
          </p>
          {email && <p className="login-message login-message--neutral">{email}</p>}
          <button className="login-button" type="button" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}

function SummaryPage({
  billingPeriod,
  isLoading,
  rows,
  summaryPeriod,
  onBillingPeriodChange,
  onExportPdf,
  onPrint,
  onSummaryPeriodChange,
}) {
  const receiptTotal = rows.reduce((total, row) => total + row.totalPaid, 0);
  const buildingGroups = groupRowsByBuilding(rows);
  const periodLabel =
    summaryPeriod === 'year'
      ? `${billingPeriod.year}`
      : `${monthOptions[billingPeriod.month - 1]} ${billingPeriod.year}`;

  return (
    <section className="summary-page" aria-label="Income summary receipt">
      <div className="summary-controls">
        <div className="summary-period-tabs" role="group" aria-label="Summary period">
          <button
            className={`summary-control-button${summaryPeriod === 'month' ? ' summary-control-button--active' : ''}`}
            type="button"
            onClick={() => onSummaryPeriodChange('month')}
          >
            Month
          </button>
          <button
            className={`summary-control-button${summaryPeriod === 'year' ? ' summary-control-button--active' : ''}`}
            type="button"
            onClick={() => onSummaryPeriodChange('year')}
          >
            Year
          </button>
        </div>

        {summaryPeriod === 'month' && (
          <select
            className="summary-select"
            aria-label="Summary month"
            value={billingPeriod.month}
            onChange={(event) =>
              onBillingPeriodChange((current) => ({
                ...current,
                month: Number(event.target.value),
              }))
            }
          >
            {monthOptions.map((monthName, index) => (
              <option key={monthName} value={index + 1}>
                {monthName}
              </option>
            ))}
          </select>
        )}

        <input
          className="summary-year-input"
          aria-label="Summary year"
          type="number"
          value={billingPeriod.year}
          onChange={(event) =>
            onBillingPeriodChange((current) => ({
              ...current,
              year: Number(event.target.value),
            }))
          }
        />

        <div className="summary-actions">
          <button
            className="summary-print-button"
            type="button"
            aria-label="Print receipt"
            onClick={onPrint}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            className="summary-print-button"
            type="button"
            aria-label="Export receipt as PDF"
            onClick={onExportPdf}
          >
            <FileDown size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <article className="receipt-sheet">
        <header className="receipt-header">
          <div>
            <p className="receipt-kicker">Income Summary Receipt</p>
            <h2>TenantTrack</h2>
            <p>{periodLabel}</p>
          </div>
          <div className="receipt-total-box">
            <span>Total Income</span>
            <strong>{formatMoney(receiptTotal)}</strong>
          </div>
        </header>

        {isLoading ? (
          <p className="system-message">Loading summary data...</p>
        ) : (
          <div className="receipt-table-wrap">
            {buildingGroups.map((buildingGroup) => (
              <section className="receipt-building" key={buildingGroup.id}>
                <header className="receipt-building__header">
                  <div>
                    <h3>{buildingGroup.name}</h3>
                    {buildingGroup.address && <p>{buildingGroup.address}</p>}
                  </div>
                  <div className="receipt-building__total">
                    <span>Building Total</span>
                    <strong>{formatMoney(buildingGroup.totalPaid)}</strong>
                  </div>
                </header>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Tenant</th>
                      <th>Rent</th>
                      <th>Water</th>
                      <th>Lights</th>
                      <th>Total</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingGroup.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.roomName}</td>
                        <td>{row.tenantName}</td>
                        <td>{formatMoney(row.rentPaid)}</td>
                        <td>{formatMoney(row.waterPaid)}</td>
                        <td>{formatMoney(row.lightPaid)}</td>
                        <td>{formatMoney(row.totalPaid)}</td>
                        <td className="receipt-note-cell">{row.notes || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2">Subtotal</td>
                      <td>{formatMoney(buildingGroup.rentPaid)}</td>
                      <td>{formatMoney(buildingGroup.waterPaid)}</td>
                      <td>{formatMoney(buildingGroup.lightPaid)}</td>
                      <td>{formatMoney(buildingGroup.totalPaid)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </section>
            ))}

            <div className="receipt-grand-total">
              <span>Grand Total</span>
              <strong>{formatMoney(receiptTotal)}</strong>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

function DetailLine({ label, name, value, isEditing, onChange, type = 'text' }) {
  return (
    <label className={`detail-line${isEditing ? ' detail-line--editing' : ''}`}>
      <span>{label}</span>
      <span className="detail-arrow">&gt;</span>
      <input
        name={name}
        type={isEditing ? type : 'text'}
        value={value ?? ''}
        placeholder={type === 'date' ? '' : 'Not set'}
        readOnly={!isEditing}
        onChange={onChange}
      />
    </label>
  );
}

function StatusSelectLine({ value, isEditing, onChange }) {
  return (
    <label className={`detail-line${isEditing ? ' detail-line--editing' : ''}`}>
      <span>Status</span>
      <span className="detail-arrow">&gt;</span>
      <select name="roomStatus" value={value} disabled={!isEditing} onChange={onChange}>
        <option value="available">Available</option>
        <option value="occupied">Occupied</option>
        <option value="unavailable">Unavailable</option>
      </select>
    </label>
  );
}

function EditRoomWindow({ room, onClose, onSaved, userEmail }) {
  const [saveMessage, setSaveMessage] = useState('');
  const [historyMessage, setHistoryMessage] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [moneyConfirmation, setMoneyConfirmation] = useState('');
  const [paymentAction, setPaymentAction] = useState(null);
  const [isDetailsEditing, setIsDetailsEditing] = useState(false);
  const [editablePayments, setEditablePayments] = useState({
    rent: false,
    water: false,
    light: false,
  });
  const [formData, setFormData] = useState({
    tenant: room.tenant ?? '',
    roomStatus: room.status ?? 'available',
    movedIn: room.movedIn ?? '',
    contractEnds: room.contractEnds ?? '',
    rentAmount: room.rentAmount ?? '',
    rentPaid: room.rentPaid ?? '',
    rentStatus: room.rentStatus ?? room.payments.rent,
    rentDueDate: room.rentDueDate ?? '',
    waterAmount: room.waterAmount ?? '',
    waterPaid: room.waterPaid ?? '',
    waterStatus: room.waterStatus ?? room.payments.water,
    waterDueDate: room.waterDueDate ?? '',
    lightAmount: room.lightAmount ?? '',
    lightPaid: room.lightPaid ?? '',
    lightStatus: room.lightStatus ?? room.payments.light,
    lightDueDate: room.lightDueDate ?? '',
  });
  const missingUtilityAmounts = getMissingUtilityAmounts(formData);
  const moneyChanges = getMoneyChanges(room, formData);
  const hasMoneyChanges = moneyChanges.length > 0;
  const hasMoneyConfirmation =
    moneyConfirmation.trim().toLowerCase() === moneyChangeConfirmation.toLowerCase();

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentHistory() {
      if (!supabase) {
        return;
      }

      setHistoryMessage('Loading history...');

      const { data, error } = await supabase
        .from(paymentHistoryTable)
        .select(
          'id, created_at, payment_type, old_amount_paid, new_amount_paid, old_status, new_status, changed_by',
        )
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (!isMounted) {
        return;
      }

      if (error) {
        setPaymentHistory([]);
        setHistoryMessage(getPaymentHistoryErrorMessage(error));
        return;
      }

      setPaymentHistory(data ?? []);
      setHistoryMessage('');
    }

    loadPaymentHistory();

    return () => {
      isMounted = false;
    };
  }, [room.id]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'tenant' && value.trim() && current.roomStatus === 'available'
        ? { roomStatus: 'occupied' }
        : {}),
      ...(name === 'tenant' && !value.trim() && current.roomStatus === 'occupied'
        ? { roomStatus: 'available' }
        : {}),
    }));
  }

  function togglePaymentEdit(paymentKey) {
    setEditablePayments((current) => ({
      ...current,
      [paymentKey]: !current[paymentKey],
    }));
  }

  function handleFullyPaid(paymentKey) {
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: current[`${paymentKey}Amount`] || 0,
      [`${paymentKey}Status`]: 'paid',
    }));
    setPaymentAction(null);
  }

  function handlePartialPayment(paymentKey, amount) {
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: amount,
      [`${paymentKey}Status`]: 'partial',
    }));
    setPaymentAction(null);
  }

  function handleRemovePaid(paymentKey) {
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: 0,
      [`${paymentKey}Status`]: 'upcoming',
    }));
    setPaymentAction(null);
  }

  async function handleUpdate() {
    if (!supabase) {
      return;
    }

    if (hasMoneyChanges && !hasMoneyConfirmation) {
      setSaveMessage(`Type "${moneyChangeConfirmation}" to confirm money changes.`);
      return;
    }

    setSaveMessage('Saving...');

    const tenantName = formData.tenant.trim();
    let activeTenantId = room.tenantId;
    let activeContractId = room.contractId;

    if (activeTenantId && tenantName) {
      const tenantUpdate = await supabase
        .from('tenants')
        .update({ full_name: tenantName })
        .eq('id', activeTenantId);

      if (tenantUpdate.error) {
        setSaveMessage(tenantUpdate.error.message);
        return;
      }
    } else if (!activeTenantId && tenantName) {
      const tenantInsert = await supabase
        .from('tenants')
        .insert({ full_name: tenantName })
        .select('id')
        .single();

      if (tenantInsert.error) {
        setSaveMessage(tenantInsert.error.message);
        return;
      }

      activeTenantId = tenantInsert.data.id;
    }

    if (activeContractId) {
      const contractUpdate = await supabase
        .from('lease_contracts')
        .update({
          start_date: formData.movedIn || null,
          end_date: formData.contractEnds || null,
          due_day: getDayFromDate(formData.rentDueDate) || null,
          status: tenantName ? 'active' : 'ended',
        })
        .eq('id', activeContractId);

      if (contractUpdate.error) {
        setSaveMessage(contractUpdate.error.message);
        return;
      }

      if (!tenantName) {
        activeContractId = null;
      }
    } else if (activeTenantId) {
      const contractInsert = await supabase
        .from('lease_contracts')
        .insert({
          tenant_id: activeTenantId,
          room_id: room.id,
          start_date: formData.movedIn || null,
          end_date: formData.contractEnds || null,
          due_day: getDayFromDate(formData.rentDueDate) || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (contractInsert.error) {
        setSaveMessage(contractInsert.error.message);
        return;
      }

      activeContractId = contractInsert.data.id;
    }

    const roomUpdate = await supabase
      .from('rooms')
      .update({
        monthly_rent: formData.rentAmount || null,
        status: formData.roomStatus,
      })
      .eq('id', room.id);

    if (roomUpdate.error) {
      setSaveMessage(roomUpdate.error.message);
      return;
    }

    const paymentHistoryRows = buildPaymentHistoryRows({
      room,
      formData,
      userEmail,
      activeContractId,
    });
    const requests = [];

    if (room.rentPaymentId) {
      requests.push(
        supabase
          .from('rent_payments')
          .update({
            amount_due: formData.rentAmount || null,
            amount_paid: formData.rentPaid || 0,
            due_date: formData.rentDueDate || null,
            status: formData.rentStatus,
          })
          .eq('id', room.rentPaymentId),
      );
    } else if (activeContractId && (formData.rentAmount || formData.rentDueDate)) {
      requests.push(
        supabase.from('rent_payments').insert({
          contract_id: activeContractId,
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.rentAmount || null,
          amount_paid: formData.rentPaid || 0,
          due_date: formData.rentDueDate || null,
          status: formData.rentStatus,
        }),
      );
    }

    if (room.waterPaymentId) {
      requests.push(
        supabase
          .from('utility_payments')
          .update({
            amount_due: formData.waterAmount || null,
            amount_paid: formData.waterPaid || 0,
            due_date: formData.waterDueDate || null,
            status: formData.waterStatus,
          })
          .eq('id', room.waterPaymentId),
      );
    } else if (activeContractId && (formData.waterAmount || formData.waterDueDate)) {
      requests.push(
        supabase.from('utility_payments').insert({
          contract_id: activeContractId,
          utility_type: 'water',
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.waterAmount || null,
          amount_paid: formData.waterPaid || 0,
          due_date: formData.waterDueDate || null,
          status: formData.waterStatus,
        }),
      );
    }

    if (room.lightPaymentId) {
      requests.push(
        supabase
          .from('utility_payments')
          .update({
            amount_due: formData.lightAmount || null,
            amount_paid: formData.lightPaid || 0,
            due_date: formData.lightDueDate || null,
            status: formData.lightStatus,
          })
          .eq('id', room.lightPaymentId),
      );
    } else if (activeContractId && (formData.lightAmount || formData.lightDueDate)) {
      requests.push(
        supabase.from('utility_payments').insert({
          contract_id: activeContractId,
          utility_type: 'electricity',
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.lightAmount || null,
          amount_paid: formData.lightPaid || 0,
          due_date: formData.lightDueDate || null,
          status: formData.lightStatus,
        }),
      );
    }

    const results = await Promise.all(requests);
    const error = results.find((result) => result.error)?.error;

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    let historySaveFailed = false;

    if (paymentHistoryRows.length > 0) {
      const { error: historyError } = await supabase
        .from(paymentHistoryTable)
        .insert(paymentHistoryRows);

      if (historyError) {
        historySaveFailed = true;
        setHistoryMessage(getPaymentHistorySaveErrorMessage(historyError));
      } else {
        setPaymentHistory((current) => [
          ...paymentHistoryRows.map((historyRow) => ({
            ...historyRow,
            id: `${historyRow.payment_type}-${Date.now()}`,
            created_at: new Date().toISOString(),
          })),
          ...current,
        ].slice(0, 8));
        setHistoryMessage('');
      }
    }

    setSaveMessage('Saved. Updating dashboard...');

    const didRefresh = await onSaved?.();

    setSaveMessage(
      didRefresh === false
        ? 'Saved, but the dashboard could not refresh automatically.'
        : `Saved. Dashboard updated.${historySaveFailed ? ' History table needs setup.' : ''}`,
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="edit-window edit-window--room" role="dialog" aria-modal="true">
        <div className="edit-window__tab">{room.buildingName} - {room.number}</div>
        <button className="modal-close-button" type="button" aria-label="Close" onClick={onClose}>
          <X size={14} />
        </button>

        <form>
          <fieldset className="edit-section edit-section--details">
            <div className="details-head">
              <span>Details</span>
              <span>Edit</span>
            </div>
            <div className="details-block">
              <div>
                <DetailLine
                  label="Tenant"
                  name="tenant"
                  value={formData.tenant}
                  isEditing={isDetailsEditing}
                  onChange={handleChange}
                />
                <StatusSelectLine
                  value={formData.roomStatus}
                  isEditing={isDetailsEditing}
                  onChange={handleChange}
                />
                <DetailLine
                  label="Moved In"
                  name="movedIn"
                  value={formData.movedIn}
                  isEditing={isDetailsEditing}
                  onChange={handleChange}
                  type="date"
                />
                <DetailLine
                  label="Contract End"
                  name="contractEnds"
                  value={formData.contractEnds}
                  isEditing={isDetailsEditing}
                  onChange={handleChange}
                  type="date"
                />
              </div>
              <button
                className={`payment-edit-check${isDetailsEditing ? ' payment-edit-check--active' : ''}`}
                type="button"
                aria-label="Edit tenant details"
                aria-pressed={isDetailsEditing}
                onClick={() => setIsDetailsEditing((current) => !current)}
              />
            </div>
          </fieldset>

          <fieldset className="edit-section edit-section--payments">
            <div className="payment-head">
              <span>Type</span>
              <span>Status</span>
              <span>Edit</span>
            </div>

            <PaymentBlock
              title="Rent"
              paymentKey="rent"
              status={formData.rentStatus}
              amountLabel="Rent Amount"
              amountName="rentAmount"
              amountValue={formData.rentAmount}
              dueName="rentDueDate"
              dueValue={formData.rentDueDate}
              isEditing={editablePayments.rent}
              onChange={handleChange}
              onStatusClick={setPaymentAction}
              onToggleEdit={togglePaymentEdit}
            />
            <PaymentBlock
              title="Water"
              paymentKey="water"
              status={formData.waterStatus}
              amountLabel="Water Amount"
              amountName="waterAmount"
              amountValue={formData.waterAmount}
              dueName="waterDueDate"
              dueValue={formData.waterDueDate}
              isEditing={editablePayments.water}
              onChange={handleChange}
              onStatusClick={setPaymentAction}
              onToggleEdit={togglePaymentEdit}
            />
            <PaymentBlock
              title="Lights"
              paymentKey="light"
              status={formData.lightStatus}
              amountLabel="Lights Amount"
              amountName="lightAmount"
              amountValue={formData.lightAmount}
              dueName="lightDueDate"
              dueValue={formData.lightDueDate}
              isEditing={editablePayments.light}
              onChange={handleChange}
              onStatusClick={setPaymentAction}
              onToggleEdit={togglePaymentEdit}
            />
          </fieldset>

          <fieldset className="edit-section edit-section--totals">
            <DetailLine
              label="Total Balance"
              name="totalBalance"
              value={getTotalBalance(formData)}
              isEditing={false}
            />
            {missingUtilityAmounts.length > 0 && (
              <p className="balance-warning">
                <AlertTriangle size={16} />
                Missing from total: {missingUtilityAmounts.join(', ')}
              </p>
            )}
            <DetailLine label="Paid" name="paid" value={getTotalPaid(formData)} isEditing={false} />
          </fieldset>

          {hasMoneyChanges && (
            <MoneyChangeConfirmation
              changes={moneyChanges}
              confirmation={moneyConfirmation}
              onConfirmationChange={setMoneyConfirmation}
            />
          )}

          <PaymentHistoryLog history={paymentHistory} message={historyMessage} />

          {saveMessage && <p className="save-message">{saveMessage}</p>}

          <button
            className="window-update-button"
            type="button"
            disabled={hasMoneyChanges && !hasMoneyConfirmation}
            onClick={handleUpdate}
          >
            Update
          </button>
        </form>

        {paymentAction && (
          <PaymentActionPanel
            payment={paymentAction}
            amountDue={formData[`${paymentAction.paymentKey}Amount`]}
            onFullyPaid={() => handleFullyPaid(paymentAction.paymentKey)}
            onPartialPayment={(amount) => handlePartialPayment(paymentAction.paymentKey, amount)}
            onRemovePaid={() => handleRemovePaid(paymentAction.paymentKey)}
            onClose={() => setPaymentAction(null)}
          />
        )}
      </section>
    </div>
  );
}

function MoneyChangeConfirmation({ changes, confirmation, onConfirmationChange }) {
  return (
    <section className="money-confirmation" aria-label="Money change confirmation">
      <div className="money-confirmation__head">
        <span>Money Change Confirmation</span>
        <span>{changes.length} change{changes.length === 1 ? '' : 's'}</span>
      </div>
      <div className="money-confirmation__body">
        <div className="money-confirmation__list">
          {changes.map((change) => (
            <p key={change.key}>
              <strong>{change.label}</strong>
              <span>
                {formatMoney(change.previousAmount)} {'->'} {formatMoney(change.nextAmount)}
              </span>
            </p>
          ))}
        </div>
        <label className="money-confirmation__field">
          <span>Type {moneyChangeConfirmation}</span>
          <input
            type="text"
            value={confirmation}
            placeholder={moneyChangeConfirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

function PaymentHistoryLog({ history, message }) {
  return (
    <section className="payment-history" aria-label="Payment history log">
      <div className="payment-history__head">
        <span>Payment History</span>
        <span>{history.length} recent</span>
      </div>

      {message && <p className="payment-history__message">{message}</p>}

      {!message && history.length === 0 && (
        <p className="payment-history__message">No payment changes logged yet.</p>
      )}

      {history.length > 0 && (
        <div className="payment-history__list">
          {history.map((entry) => (
            <article className="payment-history__item" key={entry.id}>
              <div>
                <strong>{getPaymentTypeLabel(entry.payment_type)}</strong>
                <span>{formatHistoryDate(entry.created_at)}</span>
              </div>
              <p>
                {formatMoney(normalizeAmount(entry.old_amount_paid))} / {entry.old_status}
                {' -> '}
                {formatMoney(normalizeAmount(entry.new_amount_paid))} / {entry.new_status}
              </p>
              <small>{entry.changed_by}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PaymentBlock({
  title,
  paymentKey,
  status,
  amountLabel,
  amountName,
  amountValue,
  dueName,
  dueValue,
  isEditing,
  onChange,
  onStatusClick,
  onToggleEdit,
}) {
  return (
    <section className={`payment-block${isEditing ? ' payment-block--editing' : ''}`}>
      <div>
        <DetailLine
          label={amountLabel}
          name={amountName}
          value={amountValue}
          isEditing={isEditing}
          onChange={onChange}
          type="number"
        />
        <DetailLine
          label="Due Every"
          name={dueName}
          value={dueValue}
          isEditing={isEditing}
          onChange={onChange}
          type="date"
        />
      </div>
      <button
        className={`payment-status status-dot status-${status}`}
        type="button"
        title={`${title}: ${status}`}
        aria-label={`Update ${title} payment status`}
        onClick={() => onStatusClick({ title, paymentKey })}
      />
      <button
        className={`payment-edit-check${isEditing ? ' payment-edit-check--active' : ''}`}
        type="button"
        aria-label={`Edit ${title}`}
        aria-pressed={isEditing}
        onClick={() => onToggleEdit(paymentKey)}
      />
    </section>
  );
}

function PaymentActionPanel({
  payment,
  amountDue,
  onFullyPaid,
  onPartialPayment,
  onRemovePaid,
  onClose,
}) {
  const [partialAmount, setPartialAmount] = useState('');
  const [removeConfirmation, setRemoveConfirmation] = useState('');
  const canRemovePaid =
    removeConfirmation.trim().toLowerCase() === removePaidConfirmation;

  return (
    <section className="status-popout" aria-label={`${payment.title} payment action`}>
      <div className="status-popout__tab">{payment.title} Status</div>
      <button className="status-popout__close" type="button" aria-label="Close status" onClick={onClose}>
        <X size={12} />
      </button>

      <div className="status-popout__body">
        <button className="status-action-button" type="button" onClick={onFullyPaid}>
          Fully Paid
        </button>
        <label className="partial-payment-field">
          <span>Partial Payment</span>
          <input
            type="number"
            min="0"
            max={amountDue || undefined}
            value={partialAmount}
            placeholder="Amount"
            onChange={(event) => setPartialAmount(event.target.value)}
          />
        </label>
        <button
          className="status-action-button"
          type="button"
          onClick={() => onPartialPayment(partialAmount)}
        >
          Save Partial
        </button>
        <div className="remove-paid-box">
          <label className="partial-payment-field">
            <span>Remove Paid Authorization</span>
            <input
              type="text"
              value={removeConfirmation}
              placeholder={removePaidConfirmation}
              onChange={(event) => setRemoveConfirmation(event.target.value)}
            />
          </label>
          <button
            className="status-action-button status-action-button--danger"
            type="button"
            disabled={!canRemovePaid}
            onClick={onRemovePaid}
          >
            Remove Paid
          </button>
        </div>
      </div>
    </section>
  );
}

function getTotalBalance(formData) {
  const totalDue = ['rentAmount', 'waterAmount', 'lightAmount'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const totalPaid = getTotalPaid(formData);

  return Math.max(totalDue - totalPaid, 0);
}

function isAmountMissing(amount) {
  return amount == null || String(amount).trim() === '';
}

function getMissingUtilityAmounts(formData) {
  return [
    ['Water', formData.waterAmount],
    ['Lights', formData.lightAmount],
  ]
    .filter(([, amount]) => isAmountMissing(amount))
    .map(([label]) => label);
}

function getTotalPaid(formData) {
  return ['rentPaid', 'waterPaid', 'lightPaid'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export default App;
