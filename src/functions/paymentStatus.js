import {
  paymentStatusFallback,
  paymentStatusValues,
} from '../constants/appConstants.js';

export function getPaymentStatus(activeContract, payments, utilityType) {
  if (!activeContract) {
    return 'vacant';
  }

  const filteredPayments = utilityType
    ? payments.filter((payment) => payment.utility_type === utilityType)
    : payments;

  return filteredPayments[0]?.status ?? 'upcoming';
}

export function getRoomDisplayPaymentStatus(roomStatus, activeContract, payments, utilityType) {
  if (roomStatus !== 'occupied') {
    return 'vacant';
  }

  return getPaymentStatus(activeContract, payments, utilityType);
}

export function normalizePaymentStatus(status) {
  return paymentStatusValues.has(status) ? status : paymentStatusFallback;
}

export function normalizeConfirmation(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function matchesConfirmation(value, confirmation) {
  return normalizeConfirmation(value) === normalizeConfirmation(confirmation);
}
