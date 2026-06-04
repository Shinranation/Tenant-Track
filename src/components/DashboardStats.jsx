function DashboardStats({ items }) {
  return (
    <div className="stats-grid">
      {items.map(({ icon: Icon, label, value }) => (
        <article className="stat-window" key={label}>
          <span className="stat-window__icon" aria-hidden="true">
            <Icon size={14} />
          </span>
          <span className="stat-window__value">{value}</span>
          <span className="stat-window__label">{label}</span>
        </article>
      ))}
    </div>
  );
}

export default DashboardStats;
