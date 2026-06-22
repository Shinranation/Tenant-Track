export function normalizeAmount(value) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

export function parsePaymentAmount(value) {
  if (value == null || String(value).trim() === '') {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

export function isValidPartialAmount(partialAmount, amountDue) {
  const parsedPartialAmount = parsePaymentAmount(partialAmount);
  const requiredAmount = normalizeAmount(amountDue);

  return parsedPartialAmount != null && parsedPartialAmount > 0 && parsedPartialAmount < requiredAmount;
}

export function hasRequiredPaymentAmount(amount) {
  const requiredAmount = parsePaymentAmount(amount);

  return requiredAmount != null && requiredAmount > 0;
}

export function getTotalPaid(formData) {
  return ['rentPaid', 'waterPaid', 'lightPaid'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export function getTotalBalance(formData) {
  const totalDue = ['rentAmount', 'waterAmount', 'lightAmount'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const totalPaid = getTotalPaid(formData);

  return Math.max(totalDue - totalPaid, 0);
}

export function isAmountMissing(amount) {
  return amount == null || String(amount).trim() === '';
}

export function getMissingUtilityAmounts(formData) {
  return [
    ['Water', formData.waterAmount],
    ['Lights', formData.lightAmount],
  ]
    .filter(([, amount]) => isAmountMissing(amount))
    .map(([label]) => label);
}
