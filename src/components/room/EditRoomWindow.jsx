import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  amountFieldPaymentKeys,
  moneyChangeConfirmation,
} from '../../constants/appConstants.js';
import {
  buildUpdateNotice,
  getMissingUtilityAmounts,
  getMoneyChanges,
  getPaymentHistoryErrorMessage,
  getPaymentHistorySaveErrorMessage,
  getPaymentTypeLabel,
  getTotalBalance,
  getTotalPaid,
  hasRequiredPaymentAmount,
  isValidPartialAmount,
  matchesConfirmation,
  normalizePaymentStatus,
} from '../../functions/payments.js';
import { supabase } from '../../lib/supabaseClient.js';
import { fetchPaymentHistory } from '../../services/paymentHistoryService.js';
import { saveRoomChanges } from '../../services/roomService.js';
import DetailLine from './DetailLine.jsx';
import MoneyChangeConfirmation from './MoneyChangeConfirmation.jsx';
import PaymentActionPanel from './PaymentActionPanel.jsx';
import PaymentBlock from './PaymentBlock.jsx';
import PaymentHistoryLog from './PaymentHistoryLog.jsx';
import StatusSelectLine from './StatusSelectLine.jsx';

function buildInitialRoomForm(room) {
  return {
    tenant: room.tenant ?? '',
    roomStatus: room.status ?? 'available',
    movedIn: room.movedIn ?? '',
    contractEnds: room.contractEnds ?? '',
    rentAmount: room.rentAmount ?? '',
    rentPaid: room.rentPaid ?? '',
    rentStatus: normalizePaymentStatus(room.rentStatus ?? room.payments.rent),
    rentDueDate: room.rentDueDate ?? '',
    waterAmount: room.waterAmount ?? '',
    waterPaid: room.waterPaid ?? '',
    waterStatus: normalizePaymentStatus(room.waterStatus ?? room.payments.water),
    waterDueDate: room.waterDueDate ?? '',
    lightAmount: room.lightAmount ?? '',
    lightPaid: room.lightPaid ?? '',
    lightStatus: normalizePaymentStatus(room.lightStatus ?? room.payments.light),
    lightDueDate: room.lightDueDate ?? '',
  };
}

function EditRoomWindow({ room, onClose, onSaved, onUpdateNotice, userEmail }) {
  const [saveMessage, setSaveMessage] = useState('');
  const [historyMessage, setHistoryMessage] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [moneyConfirmation, setMoneyConfirmation] = useState('');
  const [paymentAction, setPaymentAction] = useState(null);
  const [pendingPaymentPurges, setPendingPaymentPurges] = useState({
    rent: false,
    water: false,
    light: false,
  });
  const [isDetailsEditing, setIsDetailsEditing] = useState(false);
  const [editablePayments, setEditablePayments] = useState({
    rent: false,
    water: false,
    light: false,
  });
  const [formData, setFormData] = useState(() => buildInitialRoomForm(room));
  const missingUtilityAmounts = getMissingUtilityAmounts(formData);
  const moneyChanges = getMoneyChanges(room, formData);
  const hasMoneyChanges = moneyChanges.length > 0;
  const hasMoneyConfirmation = matchesConfirmation(moneyConfirmation, moneyChangeConfirmation);

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentHistory() {
      if (!supabase) {
        return;
      }

      setHistoryMessage('Loading history...');

      const { data, error } = await fetchPaymentHistory(supabase, room.id);

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
    const paymentKey = amountFieldPaymentKeys[name];

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(paymentKey && !hasRequiredPaymentAmount(value)
        ? {
            [`${paymentKey}Paid`]: 0,
            [`${paymentKey}Status`]: 'upcoming',
          }
        : {}),
      ...(name === 'tenant' && value.trim() && current.roomStatus === 'available'
        ? { roomStatus: 'occupied' }
        : {}),
      ...(name === 'tenant' && !value.trim() && current.roomStatus === 'occupied'
        ? { roomStatus: 'available' }
        : {}),
    }));

    if (paymentKey && !hasRequiredPaymentAmount(value)) {
      setPaymentAction((current) => (current?.paymentKey === paymentKey ? null : current));
    }

    if (
      (name === 'roomStatus' && value !== 'occupied') ||
      (name === 'tenant' && !value.trim() && formData.roomStatus === 'occupied')
    ) {
      setPaymentAction(null);
    }
  }

  function togglePaymentEdit(paymentKey) {
    setEditablePayments((current) => ({
      ...current,
      [paymentKey]: !current[paymentKey],
    }));
  }

  function handleFullyPaid(paymentKey) {
    setPendingPaymentPurges((current) => ({
      ...current,
      [paymentKey]: false,
    }));
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: current[`${paymentKey}Amount`] || 0,
      [`${paymentKey}Status`]: 'paid',
    }));
    setPaymentAction(null);
  }

  function handlePartialPayment(paymentKey, amount) {
    const amountDue = formData[`${paymentKey}Amount`];

    if (!isValidPartialAmount(amount, amountDue)) {
      setSaveMessage('Partial payment must be greater than 0 and below the required amount.');
      return;
    }

    setPendingPaymentPurges((current) => ({
      ...current,
      [paymentKey]: false,
    }));
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: amount,
      [`${paymentKey}Status`]: 'partial',
    }));
    setPaymentAction(null);
  }

  function handleResetPaid(paymentKey) {
    setPendingPaymentPurges((current) => ({
      ...current,
      [paymentKey]: false,
    }));
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: 0,
      [`${paymentKey}Status`]: 'upcoming',
    }));
    setPaymentAction(null);
  }

  function handlePurgePayment(paymentKey) {
    setPendingPaymentPurges((current) => ({
      ...current,
      [paymentKey]: true,
    }));
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: 0,
      [`${paymentKey}Status`]: 'upcoming',
    }));
    setSaveMessage(`${getPaymentTypeLabel(paymentKey)} payment marked for purge. Click Update to save.`);
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

    const { error, historyError, paymentHistoryRows } = await saveRoomChanges({
      supabaseClient: supabase,
      room,
      formData,
      pendingPaymentPurges,
      userEmail,
    });

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    const historySaveFailed = Boolean(historyError);

    if (historySaveFailed) {
      setHistoryMessage(getPaymentHistorySaveErrorMessage(historyError));
    } else if (paymentHistoryRows.length > 0) {
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

    setSaveMessage('Saved. Updating dashboard...');

    const didRefresh = await onSaved?.();

    onUpdateNotice?.(
      buildUpdateNotice({
        room,
        moneyChanges,
        paymentHistoryRows,
        pendingPaymentPurges,
        didRefresh,
        historySaveFailed,
      }),
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
              canEditStatus={formData.roomStatus === 'occupied'}
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
              canEditStatus={formData.roomStatus === 'occupied'}
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
              canEditStatus={formData.roomStatus === 'occupied'}
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
            onPurgePayment={() => handlePurgePayment(paymentAction.paymentKey)}
            onResetPaid={() => handleResetPaid(paymentAction.paymentKey)}
            onClose={() => setPaymentAction(null)}
          />
        )}
      </section>
    </div>
  );
}

export default EditRoomWindow;
