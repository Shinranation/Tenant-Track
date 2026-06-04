import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, Building2, CheckCircle2, DoorOpen, X } from 'lucide-react';
import BuildingCard from './components/BuildingCard.jsx';
import DashboardStats from './components/DashboardStats.jsx';
import StatusLegend from './components/StatusLegend.jsx';
import { supabase } from './lib/supabaseClient.js';

function getPaymentForBillingPeriod(payments, billingPeriod) {
  return payments.find(
    (payment) =>
      payment.billing_month === billingPeriod.month && payment.billing_year === billingPeriod.year,
  );
}

function getPaymentStatus(activeContract, payments, utilityType) {
  if (!activeContract) {
    return 'vacant';
  }

  const filteredPayments = utilityType
    ? payments.filter((payment) => payment.utility_type === utilityType)
    : payments;

  return filteredPayments[0]?.status ?? 'upcoming';
}

function buildProperties({
  buildings,
  rooms,
  tenants,
  contracts,
  rentPayments,
  utilityPayments,
  billingPeriod,
}) {
  return buildings.map((building) => ({
    id: building.id,
    name: building.name,
    address: building.address,
    rooms: rooms
      .filter((room) => room.building_id === building.id)
      .map((room) => {
        const activeContract = contracts.find(
          (contract) => contract.room_id === room.id && contract.status === 'active',
        );
        const activeRentPayments = rentPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const activeUtilityPayments = utilityPayments.filter(
          (payment) => payment.contract_id === activeContract?.id,
        );
        const latestRentPayment = getPaymentForBillingPeriod(activeRentPayments, billingPeriod);
        const latestWaterPayment = getPaymentForBillingPeriod(
          activeUtilityPayments.filter((payment) => payment.utility_type === 'water'),
          billingPeriod,
        );
        const latestLightPayment = getPaymentForBillingPeriod(
          activeUtilityPayments.filter((payment) => payment.utility_type === 'electricity'),
          billingPeriod,
        );
        const tenant = tenants.find((tenantRecord) => tenantRecord.id === activeContract?.tenant_id);
        const nestedTenant = Array.isArray(activeContract?.tenants)
          ? activeContract.tenants[0]
          : activeContract?.tenants;
        const tenantName = tenant?.full_name ?? nestedTenant?.full_name ?? null;

        return {
          id: room.id,
          number: room.room_name,
          buildingName: building.name,
          contractId: activeContract?.id ?? null,
          tenantId: activeContract?.tenant_id ?? null,
          rentPaymentId: latestRentPayment?.id ?? null,
          waterPaymentId: latestWaterPayment?.id ?? null,
          lightPaymentId: latestLightPayment?.id ?? null,
          tenant: tenantName,
          movedIn: activeContract?.start_date ?? '',
          contractEnds: activeContract?.end_date ?? '',
          dueDay: activeContract?.due_day ?? '',
          monthlyRent: room.monthly_rent,
          rentAmount: latestRentPayment?.amount_due ?? room.monthly_rent ?? '',
          rentPaid: latestRentPayment?.amount_paid ?? '',
          rentStatus: latestRentPayment?.status ?? getPaymentStatus(activeContract, activeRentPayments),
          rentDueDate: latestRentPayment?.due_date ?? '',
          waterAmount: latestWaterPayment?.amount_due ?? '',
          waterPaid: latestWaterPayment?.amount_paid ?? '',
          waterStatus:
            latestWaterPayment?.status ??
            getPaymentStatus(activeContract, activeUtilityPayments, 'water'),
          waterDueDate: latestWaterPayment?.due_date ?? '',
          lightAmount: latestLightPayment?.amount_due ?? '',
          lightPaid: latestLightPayment?.amount_paid ?? '',
          lightStatus:
            latestLightPayment?.status ??
            getPaymentStatus(activeContract, activeUtilityPayments, 'electricity'),
          lightDueDate: latestLightPayment?.due_date ?? '',
          status: room.status,
          payments: {
            rent: getPaymentStatus(activeContract, latestRentPayment ? [latestRentPayment] : []),
            light: getPaymentStatus(activeContract, latestLightPayment ? [latestLightPayment] : []),
            water: getPaymentStatus(activeContract, latestWaterPayment ? [latestWaterPayment] : []),
          },
        };
      }),
  }));
}

const monthOptions = [
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

function App() {
  const currentDate = new Date();
  const [billingPeriod, setBillingPeriod] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  });
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      if (!supabase) {
        setErrorMessage('Add your Supabase URL and anon key to .env to load property data.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      const [
        buildingsResult,
        roomsResult,
        tenantsResult,
        contractsResult,
        rentPaymentsResult,
        utilityPaymentsResult,
      ] = await Promise.all([
        supabase.from('buildings').select('id, name, address').order('created_at'),
        supabase
          .from('rooms')
          .select('id, building_id, room_name, monthly_rent, status')
          .order('created_at'),
        supabase.from('tenants').select('id, full_name'),
        supabase
          .from('lease_contracts')
          .select('id, tenant_id, room_id, start_date, end_date, due_day, status, tenants(full_name)')
          .eq('status', 'active'),
        supabase
          .from('rent_payments')
          .select(
            'id, contract_id, billing_month, billing_year, amount_due, amount_paid, due_date, status',
          ),
        supabase
          .from('utility_payments')
          .select(
            'id, contract_id, utility_type, billing_month, billing_year, amount_due, amount_paid, due_date, status',
          ),
      ]);

      const requestError =
        buildingsResult.error ||
        roomsResult.error ||
        tenantsResult.error ||
        contractsResult.error ||
        rentPaymentsResult.error ||
        utilityPaymentsResult.error;

      if (requestError) {
        setErrorMessage(requestError.message);
        setIsLoading(false);
        return;
      }

      setProperties(
        buildProperties({
          buildings: buildingsResult.data ?? [],
          rooms: roomsResult.data ?? [],
          tenants: tenantsResult.data ?? [],
          contracts: contractsResult.data ?? [],
          rentPayments: rentPaymentsResult.data ?? [],
          utilityPayments: utilityPaymentsResult.data ?? [],
          billingPeriod,
        }),
      );
      setIsLoading(false);
    }

    loadDashboard();
  }, [billingPeriod]);

  const rooms = useMemo(() => properties.flatMap((property) => property.rooms), [properties]);

  const dashboardStats = useMemo(
    () => [
      {
        label: 'Buildings',
        value: properties.length,
        icon: Building2,
      },
      {
        label: 'Rooms',
        value: rooms.length,
        icon: DoorOpen,
      },
      {
        label: 'Rooms Fully Paid',
        value: rooms.filter(
          (room) =>
            room.tenant && Object.values(room.payments).every((status) => status === 'paid'),
        ).length,
        icon: CheckCircle2,
      },
      {
        label: 'Rooms Unavailable',
        value: rooms.filter((room) => !room.tenant || room.status === 'unavailable').length,
        icon: Ban,
      },
      {
        label: 'Rooms Overdue',
        value: rooms.filter((room) => Object.values(room.payments).includes('overdue')).length,
        icon: AlertTriangle,
      },
    ],
    [properties.length, rooms],
  );

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>TenantTrack</h1>
        <button className="icon-button" aria-label="Close dashboard">
          <X size={16} />
        </button>
      </header>

      <section className="summary-band" aria-label="Portfolio details">
        <DashboardStats items={dashboardStats} />
      </section>

      <section className="dashboard-layout">
        <aside className="month-panel" aria-label="Billing month selector">
          <div className="month-panel__title">{billingPeriod.year}</div>
          <div className="month-panel__buttons">
            {monthOptions.map((monthName, index) => {
              const month = index + 1;

              return (
                <button
                  className={`month-button${billingPeriod.month === month ? ' month-button--active' : ''}`}
                  type="button"
                  key={monthName}
                  onClick={() => setBillingPeriod((current) => ({ ...current, month }))}
                >
                  {monthName.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="workspace">
          <div className="workspace-header">
            <StatusLegend />
          </div>

          {isLoading && <p className="system-message">Loading property data...</p>}
          {errorMessage && <p className="system-message system-message--error">{errorMessage}</p>}
          {!isLoading && !errorMessage && properties.length === 0 && (
            <p className="system-message">No buildings found in Supabase yet.</p>
          )}

          {!isLoading && !errorMessage && properties.length > 0 && (
            <div className="building-grid">
              {properties.map((property) => (
                <BuildingCard
                  key={property.id}
                  property={property}
                  onEditRoom={(room) =>
                    setEditingRoom({
                      ...room,
                      billingMonth: billingPeriod.month,
                      billingYear: billingPeriod.year,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </section>

      {editingRoom && <EditRoomWindow room={editingRoom} onClose={() => setEditingRoom(null)} />}

      <footer>Designed and Created by: Jayrad P. Adeva</footer>
    </main>
  );
}

function DetailLine({ label, name, value, isEditing, onChange, type = 'text' }) {
  return (
    <label className="detail-line">
      <span>{label}</span>
      <span className="detail-arrow">&gt;</span>
      <input
        name={name}
        type={isEditing ? type : 'text'}
        value={value ?? ''}
        placeholder={type === 'date' ? '' : 'Not set'}
        readOnly={!isEditing}
        onChange={onChange}
      />
    </label>
  );
}

function EditRoomWindow({ room, onClose }) {
  const [saveMessage, setSaveMessage] = useState('');
  const [paymentAction, setPaymentAction] = useState(null);
  const [isDetailsEditing, setIsDetailsEditing] = useState(false);
  const [editablePayments, setEditablePayments] = useState({
    rent: false,
    water: false,
    light: false,
  });
  const [formData, setFormData] = useState({
    tenant: room.tenant ?? '',
    movedIn: room.movedIn ?? '',
    contractEnds: room.contractEnds ?? '',
    rentAmount: room.rentAmount ?? '',
    rentPaid: room.rentPaid ?? '',
    rentStatus: room.rentStatus ?? room.payments.rent,
    rentDueDate: room.rentDueDate ?? '',
    waterAmount: room.waterAmount ?? '',
    waterPaid: room.waterPaid ?? '',
    waterStatus: room.waterStatus ?? room.payments.water,
    waterDueDate: room.waterDueDate ?? '',
    lightAmount: room.lightAmount ?? '',
    lightPaid: room.lightPaid ?? '',
    lightStatus: room.lightStatus ?? room.payments.light,
    lightDueDate: room.lightDueDate ?? '',
  });

  function handleChange(event) {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function togglePaymentEdit(paymentKey) {
    setEditablePayments((current) => ({
      ...current,
      [paymentKey]: !current[paymentKey],
    }));
  }

  function handleFullyPaid(paymentKey) {
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: current[`${paymentKey}Amount`] || 0,
      [`${paymentKey}Status`]: 'paid',
    }));
    setPaymentAction(null);
  }

  function handlePartialPayment(paymentKey, amount) {
    setFormData((current) => ({
      ...current,
      [`${paymentKey}Paid`]: amount,
      [`${paymentKey}Status`]: 'partial',
    }));
    setPaymentAction(null);
  }

  async function handleUpdate() {
    if (!supabase) {
      return;
    }

    setSaveMessage('Saving...');

    const requests = [
      supabase
        .from('rooms')
        .update({ monthly_rent: formData.rentAmount || null })
        .eq('id', room.id),
    ];

    if (room.tenantId && formData.tenant) {
      requests.push(
        supabase.from('tenants').update({ full_name: formData.tenant }).eq('id', room.tenantId),
      );
    }

    if (room.contractId) {
      requests.push(
        supabase
          .from('lease_contracts')
          .update({
            start_date: formData.movedIn || null,
            end_date: formData.contractEnds || null,
          })
          .eq('id', room.contractId),
      );
    }

    if (room.rentPaymentId) {
      requests.push(
        supabase
          .from('rent_payments')
          .update({
            amount_due: formData.rentAmount || null,
            amount_paid: formData.rentPaid || 0,
            due_date: formData.rentDueDate || null,
            status: formData.rentStatus,
          })
          .eq('id', room.rentPaymentId),
      );
    } else if (room.contractId && (formData.rentAmount || formData.rentDueDate)) {
      requests.push(
        supabase.from('rent_payments').insert({
          contract_id: room.contractId,
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.rentAmount || null,
          amount_paid: formData.rentPaid || 0,
          due_date: formData.rentDueDate || null,
          status: formData.rentStatus,
        }),
      );
    }

    if (room.waterPaymentId) {
      requests.push(
        supabase
          .from('utility_payments')
          .update({
            amount_due: formData.waterAmount || null,
            amount_paid: formData.waterPaid || 0,
            due_date: formData.waterDueDate || null,
            status: formData.waterStatus,
          })
          .eq('id', room.waterPaymentId),
      );
    } else if (room.contractId && (formData.waterAmount || formData.waterDueDate)) {
      requests.push(
        supabase.from('utility_payments').insert({
          contract_id: room.contractId,
          utility_type: 'water',
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.waterAmount || null,
          amount_paid: formData.waterPaid || 0,
          due_date: formData.waterDueDate || null,
          status: formData.waterStatus,
        }),
      );
    }

    if (room.lightPaymentId) {
      requests.push(
        supabase
          .from('utility_payments')
          .update({
            amount_due: formData.lightAmount || null,
            amount_paid: formData.lightPaid || 0,
            due_date: formData.lightDueDate || null,
            status: formData.lightStatus,
          })
          .eq('id', room.lightPaymentId),
      );
    } else if (room.contractId && (formData.lightAmount || formData.lightDueDate)) {
      requests.push(
        supabase.from('utility_payments').insert({
          contract_id: room.contractId,
          utility_type: 'electricity',
          billing_month: room.billingMonth,
          billing_year: room.billingYear,
          amount_due: formData.lightAmount || null,
          amount_paid: formData.lightPaid || 0,
          due_date: formData.lightDueDate || null,
          status: formData.lightStatus,
        }),
      );
    }

    const results = await Promise.all(requests);
    const error = results.find((result) => result.error)?.error;

    if (error) {
      setSaveMessage(error.message);
      return;
    }

    setSaveMessage('Saved. Refresh the page to view updated dashboard totals.');
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
            <legend>Details</legend>
            <button
              className={`section-edit-button${isDetailsEditing ? ' section-edit-button--active' : ''}`}
              type="button"
              aria-label="Edit tenant details"
              aria-pressed={isDetailsEditing}
              onClick={() => setIsDetailsEditing((current) => !current)}
            >
              Edit
            </button>
            <DetailLine
              label="Tenant"
              name="tenant"
              value={formData.tenant}
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
            <DetailLine label="Paid" name="paid" value={getTotalPaid(formData)} isEditing={false} />
          </fieldset>

          {saveMessage && <p className="save-message">{saveMessage}</p>}

          <button className="window-update-button" type="button" onClick={handleUpdate}>
            Update
          </button>
        </form>

        {paymentAction && (
          <PaymentActionPanel
            payment={paymentAction}
            amountDue={formData[`${paymentAction.paymentKey}Amount`]}
            onFullyPaid={() => handleFullyPaid(paymentAction.paymentKey)}
            onPartialPayment={(amount) => handlePartialPayment(paymentAction.paymentKey, amount)}
            onClose={() => setPaymentAction(null)}
          />
        )}
      </section>
    </div>
  );
}

function PaymentBlock({
  title,
  paymentKey,
  status,
  amountLabel,
  amountName,
  amountValue,
  dueName,
  dueValue,
  isEditing,
  onChange,
  onStatusClick,
  onToggleEdit,
}) {
  return (
    <section className="payment-block">
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
        title={`${title}: ${status}`}
        aria-label={`Update ${title} payment status`}
        onClick={() => onStatusClick({ title, paymentKey })}
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

function PaymentActionPanel({ payment, amountDue, onFullyPaid, onPartialPayment, onClose }) {
  const [partialAmount, setPartialAmount] = useState('');

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
            max={amountDue || undefined}
            value={partialAmount}
            placeholder="Amount"
            onChange={(event) => setPartialAmount(event.target.value)}
          />
        </label>
        <button
          className="status-action-button"
          type="button"
          onClick={() => onPartialPayment(partialAmount)}
        >
          Save Partial
        </button>
      </div>
    </section>
  );
}

function getTotalBalance(formData) {
  const totalDue = ['rentAmount', 'waterAmount', 'lightAmount'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const totalPaid = getTotalPaid(formData);

  return Math.max(totalDue - totalPaid, 0);
}

function getTotalPaid(formData) {
  return ['rentPaid', 'waterPaid', 'lightPaid'].reduce((total, key) => {
    const amount = Number(formData[key]);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

export default App;
