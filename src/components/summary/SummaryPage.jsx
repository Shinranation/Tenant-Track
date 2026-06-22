import { FileDown, Printer } from 'lucide-react';
import { monthOptions } from '../../constants/appConstants.js';
import { formatMoney } from '../../functions/formatters.js';
import { groupRowsByBuilding } from '../../functions/summary.js';

function SummaryPage({
  billingPeriod,
  isLoading,
  rows,
  summaryPeriod,
  onBillingPeriodChange,
  onExportPdf,
  onPrint,
  onSummaryPeriodChange,
}) {
  const receiptTotal = rows.reduce((total, row) => total + row.totalPaid, 0);
  const buildingGroups = groupRowsByBuilding(rows);
  const periodLabel =
    summaryPeriod === 'year'
      ? `${billingPeriod.year}`
      : `${monthOptions[billingPeriod.month - 1]} ${billingPeriod.year}`;

  return (
    <section className="summary-page" aria-label="Income summary receipt">
      <div className="summary-controls">
        <div className="summary-period-tabs" role="group" aria-label="Summary period">
          <button
            className={`summary-control-button${summaryPeriod === 'month' ? ' summary-control-button--active' : ''}`}
            type="button"
            onClick={() => onSummaryPeriodChange('month')}
          >
            Month
          </button>
          <button
            className={`summary-control-button${summaryPeriod === 'year' ? ' summary-control-button--active' : ''}`}
            type="button"
            onClick={() => onSummaryPeriodChange('year')}
          >
            Year
          </button>
        </div>

        {summaryPeriod === 'month' && (
          <select
            className="summary-select"
            aria-label="Summary month"
            value={billingPeriod.month}
            onChange={(event) =>
              onBillingPeriodChange((current) => ({
                ...current,
                month: Number(event.target.value),
              }))
            }
          >
            {monthOptions.map((monthName, index) => (
              <option key={monthName} value={index + 1}>
                {monthName}
              </option>
            ))}
          </select>
        )}

        <input
          className="summary-year-input"
          aria-label="Summary year"
          type="number"
          value={billingPeriod.year}
          onChange={(event) =>
            onBillingPeriodChange((current) => ({
              ...current,
              year: Number(event.target.value),
            }))
          }
        />

        <div className="summary-actions">
          <button
            className="summary-print-button"
            type="button"
            aria-label="Print receipt"
            onClick={onPrint}
          >
            <Printer size={16} />
            Print
          </button>
          <button
            className="summary-print-button"
            type="button"
            aria-label="Export receipt as PDF"
            onClick={onExportPdf}
          >
            <FileDown size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <article className="receipt-sheet">
        <header className="receipt-header">
          <div>
            <p className="receipt-kicker">Income Summary Receipt</p>
            <h2>TenantTrack</h2>
            <p>{periodLabel}</p>
          </div>
          <div className="receipt-total-box">
            <span>Total Income</span>
            <strong>{formatMoney(receiptTotal)}</strong>
          </div>
        </header>

        {isLoading ? (
          <p className="system-message">Loading summary data...</p>
        ) : (
          <div className="receipt-table-wrap">
            {buildingGroups.map((buildingGroup) => (
              <section className="receipt-building" key={buildingGroup.id}>
                <header className="receipt-building__header">
                  <div>
                    <h3>{buildingGroup.name}</h3>
                    {buildingGroup.address && <p>{buildingGroup.address}</p>}
                  </div>
                  <div className="receipt-building__total">
                    <span>Building Total</span>
                    <strong>{formatMoney(buildingGroup.totalPaid)}</strong>
                  </div>
                </header>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Tenant</th>
                      <th>Rent</th>
                      <th>Water</th>
                      <th>Lights</th>
                      <th>Total</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingGroup.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.roomName}</td>
                        <td>{row.tenantName}</td>
                        <td>{formatMoney(row.rentPaid)}</td>
                        <td>{formatMoney(row.waterPaid)}</td>
                        <td>{formatMoney(row.lightPaid)}</td>
                        <td>{formatMoney(row.totalPaid)}</td>
                        <td className="receipt-note-cell">{row.notes || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2">Subtotal</td>
                      <td>{formatMoney(buildingGroup.rentPaid)}</td>
                      <td>{formatMoney(buildingGroup.waterPaid)}</td>
                      <td>{formatMoney(buildingGroup.lightPaid)}</td>
                      <td>{formatMoney(buildingGroup.totalPaid)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </section>
            ))}

            <div className="receipt-grand-total">
              <span>Grand Total</span>
              <strong>{formatMoney(receiptTotal)}</strong>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

export default SummaryPage;
