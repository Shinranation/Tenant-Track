export const monthOptions = [
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

export const monthlyNotesStorageKey = 'tenanttrack.monthlyNotes.v1';

export const emptyPortfolioRecords = {
  buildings: [],
  rooms: [],
  tenants: [],
  contracts: [],
  rentPayments: [],
  utilityPayments: [],
};

export const moneyChangeConfirmation = 'yes I am sure';

export const moneyFields = [
  ['Rent Amount', 'rentAmount'],
  ['Rent Paid', 'rentPaid'],
  ['Water Amount', 'waterAmount'],
  ['Water Paid', 'waterPaid'],
  ['Lights Amount', 'lightAmount'],
  ['Lights Paid', 'lightPaid'],
];

export const amountFieldPaymentKeys = {
  rentAmount: 'rent',
  waterAmount: 'water',
  lightAmount: 'light',
};

export const resetPaidConfirmation = moneyChangeConfirmation;
export const purgePaymentConfirmation = 'purge payment';
export const paymentHistoryTable = 'payment_history_logs';
export const paymentStatusFallback = 'upcoming';
export const paymentStatusValues = new Set(['paid', 'partial', 'upcoming', 'overdue']);

export const paymentTypes = [
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
