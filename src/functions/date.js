export function formatBillingDate(billingPeriod, day) {
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

export function getDayFromDate(date) {
  if (!date) {
    return '';
  }

  return Number(date.split('-')[2]);
}
