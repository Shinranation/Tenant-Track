import { formatHistoryDate, formatMoney } from '../../functions/formatters.js';
import {
  getPaymentTypeLabel,
} from '../../functions/paymentHistory.js';
import { normalizeAmount } from '../../functions/paymentAmounts.js';

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

export default PaymentHistoryLog;
