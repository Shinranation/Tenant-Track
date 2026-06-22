import { moneyChangeConfirmation } from '../../constants/appConstants.js';
import { formatMoney } from '../../functions/formatters.js';

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

export default MoneyChangeConfirmation;
