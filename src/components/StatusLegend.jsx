const legendItems = [
  { label: 'Paid', status: 'paid' },
  { label: 'Partial', status: 'partial' },
  { label: 'Upcoming', status: 'upcoming' },
  { label: 'Overdue', status: 'overdue' },
  { label: 'Vacant', status: 'vacant' },
];

function StatusLegend() {
  return (
    <section className="legend-box" aria-label="Payment status legend">
      <div className="legend-box__title">Status</div>
      <div className="legend">
        {legendItems.map((item) => (
          <span className="legend__item" key={item.status}>
            <span className={`status-dot status-${item.status}`} />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default StatusLegend;
