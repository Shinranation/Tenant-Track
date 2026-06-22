import {
  moneyFields,
  paymentTypes,
} from '../constants/appConstants.js';
import { normalizeAmount } from './paymentAmounts.js';
import { getPaymentTypeLabel } from './paymentHistory.js';

export function getMoneyChanges(room, formData) {
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

export function getPendingPurgeLabels(pendingPaymentPurges) {
  return paymentTypes
    .filter((paymentType) => pendingPaymentPurges[paymentType.key])
    .map((paymentType) => paymentType.label);
}

export function buildUpdateNotice({
  room,
  moneyChanges,
  paymentHistoryRows,
  pendingPaymentPurges,
  didRefresh,
  historySaveFailed,
}) {
  const summary = [];
  const purgeLabels = getPendingPurgeLabels(pendingPaymentPurges);

  if (purgeLabels.length > 0) {
    summary.push(`Purged ${purgeLabels.join(', ')} payment record${purgeLabels.length === 1 ? '' : 's'}.`);
  }

  if (paymentHistoryRows.length > 0) {
    summary.push(
      `Updated ${paymentHistoryRows
        .map((historyRow) => getPaymentTypeLabel(historyRow.payment_type))
        .join(', ')} payment status or paid amount.`,
    );
  }

  if (moneyChanges.length > 0) {
    summary.push(`Changed ${moneyChanges.map((change) => change.label).join(', ')}.`);
  }

  if (summary.length === 0) {
    summary.push('Room details saved.');
  }

  summary.push(
    didRefresh === false
      ? 'Saved, but the dashboard could not refresh automatically.'
      : 'Dashboard updated.',
  );

  if (historySaveFailed) {
    summary.push('Payment history still needs setup.');
  }

  return {
    title: 'Update Saved',
    subtitle: `${room.buildingName} - ${room.number}`,
    summary,
  };
}
