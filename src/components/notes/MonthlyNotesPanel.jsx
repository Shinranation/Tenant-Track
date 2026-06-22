import { ChevronDown } from 'lucide-react';
import { monthOptions } from '../../constants/appConstants.js';
import { getMonthlyNoteKey } from '../../functions/notes.js';

function MonthlyNotesPanel({
  billingPeriod,
  isOpen,
  noteCount,
  notes,
  onNoteBlur,
  onNoteChange,
  onToggle,
  properties,
}) {
  return (
    <section
      className={`monthly-notes${isOpen ? ' monthly-notes--open' : ''}`}
      aria-label="Monthly short-term agreement notes"
    >
      <button
        className="monthly-notes__toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>Notes - {monthOptions[billingPeriod.month - 1]} {billingPeriod.year}</span>
        <span className="monthly-notes__count">
          {noteCount} saved {noteCount === 1 ? 'note' : 'notes'}
        </span>
        <ChevronDown size={18} />
      </button>

      {isOpen && (
        <div className="monthly-notes__grid">
          {properties.map((property) => (
            <article className="monthly-notes__building" key={property.id}>
              <label className="note-field note-field--building">
                <span>{property.name}</span>
                <textarea
                  value={notes[getMonthlyNoteKey('building', property.id, billingPeriod)] ?? ''}
                  placeholder="Building note"
                  onChange={(event) =>
                    onNoteChange(
                      getMonthlyNoteKey('building', property.id, billingPeriod),
                      event.target.value,
                    )
                  }
                  onBlur={(event) =>
                    onNoteBlur?.(
                      getMonthlyNoteKey('building', property.id, billingPeriod),
                      event.target.value,
                    )
                  }
                />
              </label>

              <div className="room-note-list">
                {property.rooms.map((room) => (
                  <label className="note-field" key={room.id}>
                    <span>{room.number}</span>
                    <textarea
                      value={notes[getMonthlyNoteKey('room', room.id, billingPeriod)] ?? ''}
                      placeholder="Room agreement note"
                      onChange={(event) =>
                        onNoteChange(
                          getMonthlyNoteKey('room', room.id, billingPeriod),
                          event.target.value,
                        )
                      }
                      onBlur={(event) =>
                        onNoteBlur?.(
                          getMonthlyNoteKey('room', room.id, billingPeriod),
                          event.target.value,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default MonthlyNotesPanel;
