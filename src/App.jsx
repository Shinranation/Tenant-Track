import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  DoorOpen,
} from 'lucide-react';
import AccessDeniedScreen from './components/auth/AccessDeniedScreen.jsx';
import LoginScreen from './components/auth/LoginScreen.jsx';
import BuildingCard from './components/BuildingCard.jsx';
import DashboardStats from './components/DashboardStats.jsx';
import MonthlyNotesPanel from './components/notes/MonthlyNotesPanel.jsx';
import EditRoomWindow from './components/room/EditRoomWindow.jsx';
import StatusLegend from './components/StatusLegend.jsx';
import SummaryPage from './components/summary/SummaryPage.jsx';
import UpdateNoticeDialog from './components/UpdateNoticeDialog.jsx';
import {
  emptyPortfolioRecords,
  monthOptions,
  monthlyNotesStorageKey,
} from './constants/appConstants.js';
import {
  getMonthlyNoteCount,
  hasMonthlyRoomNote,
  loadMonthlyNotes,
} from './functions/notes.js';
import { buildProperties } from './functions/properties.js';
import {
  buildSummaryRows,
  getReceiptExportTitle,
} from './functions/summary.js';
import { supabase } from './lib/supabaseClient.js';
import { findAllowedUserByEmail } from './services/authService.js';
import {
  fetchMonthlyNotesForYear,
  saveMonthlyNote,
} from './services/monthlyNotesService.js';
import { fetchPortfolioRecords } from './services/portfolioService.js';

function getInitialBillingPeriod() {
  const currentDate = new Date();

  return {
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  };
}

function App() {
  const [billingPeriod, setBillingPeriod] = useState(getInitialBillingPeriod);
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState('checking');
  const [properties, setProperties] = useState([]);
  const [portfolioRecords, setPortfolioRecords] = useState(emptyPortfolioRecords);
  const [activePage, setActivePage] = useState('dashboard');
  const [summaryPeriod, setSummaryPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [updateNotice, setUpdateNotice] = useState(null);
  const [monthlyNotes, setMonthlyNotes] = useState(loadMonthlyNotes);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Add your Supabase URL and anon key to .env to load property data.');
      setIsLoading(false);
      return false;
    }

    if (!session || accessStatus !== 'allowed') {
      setProperties([]);
      setPortfolioRecords(emptyPortfolioRecords);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    setErrorMessage('');

    const { error, records } = await fetchPortfolioRecords(supabase);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return false;
    }

    setPortfolioRecords(records);
    setProperties(
      buildProperties({
        ...records,
        billingPeriod,
      }),
    );

    const { notes } = await fetchMonthlyNotesForYear(supabase, billingPeriod.year);

    setMonthlyNotes((current) => ({
      ...current,
      ...notes,
    }));
    setIsLoading(false);
    return true;
  }, [accessStatus, billingPeriod, session]);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      setAccessStatus('denied');
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAccessStatus('checking');
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAllowedUser() {
      if (!supabase || !session) {
        setAccessStatus('denied');
        return;
      }

      const email = session.user?.email;

      if (!email) {
        setAccessStatus('denied');
        return;
      }

      setAccessStatus('checking');

      const { data, error } = await findAllowedUserByEmail(supabase, email);

      if (!isMounted) {
        return;
      }

      setAccessStatus(!error && data ? 'allowed' : 'denied');
    }

    checkAllowedUser();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    window.localStorage.setItem(monthlyNotesStorageKey, JSON.stringify(monthlyNotes));
  }, [monthlyNotes]);

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
  const monthlyNoteCount = useMemo(
    () => getMonthlyNoteCount(monthlyNotes, billingPeriod, properties),
    [billingPeriod, monthlyNotes, properties],
  );
  const summaryRows = useMemo(
    () => buildSummaryRows(portfolioRecords, billingPeriod, summaryPeriod, monthlyNotes),
    [billingPeriod, monthlyNotes, portfolioRecords, summaryPeriod],
  );

  function handleMonthlyNoteChange(noteKey, value) {
    setMonthlyNotes((current) => ({
      ...current,
      [noteKey]: value,
    }));
  }

  async function handleMonthlyNoteBlur(noteKey, value) {
    if (!supabase || accessStatus !== 'allowed') {
      return;
    }

    await saveMonthlyNote(supabase, noteKey, value);
  }

  function handleReceiptPdfExport() {
    if (typeof window === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    document.title = getReceiptExportTitle(billingPeriod, summaryPeriod);
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 750);
  }

  function handleReceiptPrint() {
    window.print();
  }

  if (isAuthLoading) {
    return (
      <main className="app-shell">
        <p className="system-message">Checking login...</p>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (accessStatus === 'checking') {
    return (
      <main className="app-shell">
        <p className="system-message">Checking approved user...</p>
      </main>
    );
  }

  if (accessStatus === 'denied') {
    return <AccessDeniedScreen email={session.user?.email} />;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-strip">
          <h1>TenantTrack</h1>
          <button
            className="page-switch-button"
            type="button"
            onClick={() =>
              setActivePage((current) => (current === 'summary' ? 'dashboard' : 'summary'))
            }
          >
            {activePage === 'summary' ? 'Dashboard' : 'Summary'}
          </button>
        </div>
        <button className="logout-button" type="button" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </header>

      {activePage === 'dashboard' ? (
        <>
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
                      hasRoomNote={(roomId) => hasMonthlyRoomNote(monthlyNotes, billingPeriod, roomId)}
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

          {!isLoading && !errorMessage && properties.length > 0 && (
            <MonthlyNotesPanel
              billingPeriod={billingPeriod}
              isOpen={isNotesOpen}
              noteCount={monthlyNoteCount}
              notes={monthlyNotes}
              onNoteBlur={handleMonthlyNoteBlur}
              onNoteChange={handleMonthlyNoteChange}
              onToggle={() => setIsNotesOpen((current) => !current)}
              properties={properties}
            />
          )}
        </>
      ) : (
        <SummaryPage
          billingPeriod={billingPeriod}
          isLoading={isLoading}
          rows={summaryRows}
          summaryPeriod={summaryPeriod}
          onBillingPeriodChange={setBillingPeriod}
          onExportPdf={handleReceiptPdfExport}
          onPrint={handleReceiptPrint}
          onSummaryPeriodChange={setSummaryPeriod}
        />
      )}

      {editingRoom && (
        <EditRoomWindow
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={loadDashboard}
          onUpdateNotice={(notice) => {
            setEditingRoom(null);
            setUpdateNotice(notice);
          }}
          userEmail={session.user?.email}
        />
      )}

      {updateNotice && (
        <UpdateNoticeDialog notice={updateNotice} onClose={() => setUpdateNotice(null)} />
      )}

      <footer>Designed and Created by: Jayrad P. Adeva</footer>
    </main>
  );
}

export default App;
