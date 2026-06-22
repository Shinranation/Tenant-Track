import { hasRequiredPaymentAmount } from '../../functions/payments.js';
import DetailLine from './DetailLine.jsx';

function PaymentBlock({
  title,
  paymentKey,
  status,
  amountLabel,
  amountName,
  amountValue,
  canEditStatus,
  dueName,
  dueValue,
  isEditing,
  onChange,
  onStatusClick,
  onToggleEdit,
}) {
  const hasRequiredAmount = hasRequiredPaymentAmount(amountValue);
  const canOpenStatusAction = canEditStatus && hasRequiredAmount;
  const statusTitle = canOpenStatusAction
    ? `${title}: ${status}`
    : `${title}: ${canEditStatus ? 'set amount before updating status' : 'room must be occupied to update status'}`;

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
        title={statusTitle}
        aria-label={statusTitle}
        disabled={!canOpenStatusAction}
        onClick={() => canOpenStatusAction && onStatusClick({ title, paymentKey })}
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

export default PaymentBlock;
