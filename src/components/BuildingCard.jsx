import { Edit3 } from 'lucide-react';

const paymentLabels = {
  rent: 'Rent',
  light: 'Light',
  water: 'Water',
};

const statusLabels = {
  paid: 'Paid',
  partial: 'Partial Payment',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  vacant: 'Vacant',
};

function StatusDot({ status, label }) {
  return (
    <span
      className={`status-dot status-${status}`}
      aria-label={`${label}: ${statusLabels[status]}`}
      title={`${label}: ${statusLabels[status]}`}
    />
  );
}

function BuildingCard({ property, onEditRoom }) {
  return (
    <article className="building-card">
      <div className="building-card__title">{property.name}</div>

      <div className="room-table" role="table" aria-label={`${property.name} payment status`}>
        <div className="room-row room-row--head" role="row">
          <span role="columnheader">Unit</span>
          {Object.values(paymentLabels).map((label) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
          <span role="columnheader">Edit</span>
        </div>

        {property.rooms.map((room) => (
          <div className="room-row" role="row" key={room.id}>
            <span role="cell">{room.number}</span>
            {Object.entries(room.payments).map(([key, status]) => (
              <span role="cell" key={key}>
                <StatusDot status={status} label={paymentLabels[key]} />
              </span>
            ))}
            <span role="cell">
              <button
                className="edit-button"
                aria-label={`Edit ${room.number}`}
                onClick={() => onEditRoom(room)}
              >
                <Edit3 size={10} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default BuildingCard;
