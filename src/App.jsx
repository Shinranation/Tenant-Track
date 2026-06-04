import { AlertTriangle, Ban, Building2, CheckCircle2, DoorOpen, X } from 'lucide-react';
import BuildingCard from './components/BuildingCard.jsx';
import DashboardStats from './components/DashboardStats.jsx';
import StatusLegend from './components/StatusLegend.jsx';
import { properties } from './data/sampleProperties.js';

const rooms = properties.flatMap((property) => property.rooms);

const dashboardStats = [
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
      (room) => room.tenant && Object.values(room.payments).every((status) => status === 'paid'),
    ).length,
    icon: CheckCircle2,
  },
  {
    label: 'Rooms Unavailable',
    value: rooms.filter((room) => !room.tenant).length,
    icon: Ban,
  },
  {
    label: 'Rooms Overdue',
    value: rooms.filter((room) => Object.values(room.payments).includes('overdue')).length,
    icon: AlertTriangle,
  },
];

function App() {
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

      <section className="workspace">
        <div className="workspace-header">
          <StatusLegend />
        </div>

        <div className="building-grid">
          {properties.map((property) => (
            <BuildingCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      <footer>Designed and Created by: Jayrad P. Adeva</footer>
    </main>
  );
}

export default App;
