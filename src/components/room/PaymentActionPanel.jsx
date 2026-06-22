import { useState } from 'react';
import { X } from 'lucide-react';
import {
  purgePaymentConfirmation,
  resetPaidConfirmation,
} from '../../constants/appConstants.js';
import { formatMoney } from '../../functions/formatters.js';
import {
  isValidPartialAmount,
  matchesConfirmation,
  normalizeAmount,
  parsePaymentAmount,
} from '../../functions/payments.js';

function PaymentActionPanel({
  payment,
  amountDue,
  onFullyPaid,
  onPartialPayment,
  onPurgePayment,
  onResetPaid,
  onClose,
}) {
  const [partialAmount, setPartialAmount] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const requiredAmount = normalizeAmount(amountDue);
  const partialPaymentAmount = parsePaymentAmount(partialAmount);
  const hasPartialInput = partialPaymentAmount != null;
  const canSavePartial = isValidPartialAmount(partialAmount, amountDue);
  const partialMax = requiredAmount > 0 ? Math.max(requiredAmount - 0.01, 0) : undefined;
  const partialMessage =
    hasPartialInput && !canSavePartial
      ? `Enter more than 0 and less than ${formatMoney(requiredAmount)}.`
      : '';
  const canResetPaid = matchesConfirmation(resetConfirmation, resetPaidConfirmation);
  const canPurgePayment = matchesConfirmation(purgeConfirmation, purgePaymentConfirmation);

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
            max={partialMax}
            step="0.01"
            value={partialAmount}
            placeholder="Amount"
            onChange={(event) => setPartialAmount(event.target.value)}
          />
          {partialMessage && <small>{partialMessage}</small>}
        </label>
        <button
          className="status-action-button"
          type="button"
          disabled={!canSavePartial}
          onClick={() => onPartialPayment(partialAmount)}
        >
          Save Partial
        </button>
        <div className="remove-paid-box">
          <label className="partial-payment-field">
            <span>Reset Paid Authorization</span>
            <input
              type="text"
              value={resetConfirmation}
              placeholder={resetPaidConfirmation}
              onChange={(event) => setResetConfirmation(event.target.value)}
            />
          </label>
          <button
            className="status-action-button status-action-button--danger"
            type="button"
            disabled={!canResetPaid}
            onClick={onResetPaid}
          >
            Reset Paid
          </button>
        </div>
        <div className="remove-paid-box remove-paid-box--purge">
          <label className="partial-payment-field">
            <span>Full Purge Authorization</span>
            <input
              type="text"
              value={purgeConfirmation}
              placeholder={purgePaymentConfirmation}
              onChange={(event) => setPurgeConfirmation(event.target.value)}
            />
          </label>
          <button
            className="status-action-button status-action-button--danger"
            type="button"
            disabled={!canPurgePayment}
            onClick={onPurgePayment}
          >
            Purge Payment
          </button>
        </div>
      </div>
    </section>
  );
}

export default PaymentActionPanel;
