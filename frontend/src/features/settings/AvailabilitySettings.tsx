import { useEffect, useMemo, useRef, useState } from 'react';

import { apiJson } from '../../lib/api';

interface TimeSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface TimeCell {
  dayIndex: number;
  slotIndex: number;
  startMinutes: number;
  endMinutes: number;
  label: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const START_HOUR = 7;
const END_HOUR = 22;
const STEP_MINUTES = 15;
const CELLS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / STEP_MINUTES;

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function formatLabel(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${displayHour}${ampm.toLowerCase()}` : `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function cellKey(dayIndex: number, slotIndex: number) {
  return `${dayIndex}:${slotIndex}`;
}

function buildCells(): TimeCell[] {
  const cells: TimeCell[] = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    for (let slotIndex = 0; slotIndex < CELLS_PER_DAY; slotIndex += 1) {
      const startMinutes = START_HOUR * 60 + slotIndex * STEP_MINUTES;
      const endMinutes = startMinutes + STEP_MINUTES;
      cells.push({
        dayIndex,
        slotIndex,
        startMinutes,
        endMinutes,
        label: slotIndex % 4 === 0 ? formatLabel(startMinutes) : '',
      });
    }
  }
  return cells;
}

function slotsToSelectionMap(slots: TimeSlot[]) {
  const selection = new Set<string>();

  for (const slot of slots) {
    const start = timeToMinutes(slot.start_time);
    const end = timeToMinutes(slot.end_time);
    const dayStart = slot.day_of_week * CELLS_PER_DAY;
    const dayEnd = dayStart + CELLS_PER_DAY;

    for (let index = dayStart; index < dayEnd; index += 1) {
      const dayIndex = Math.floor(index / CELLS_PER_DAY);
      const slotIndex = index % CELLS_PER_DAY;
      const cellStart = START_HOUR * 60 + slotIndex * STEP_MINUTES;
      const cellEnd = cellStart + STEP_MINUTES;
      const overlaps = start < cellEnd && end > cellStart;
      if (overlaps) {
        selection.add(cellKey(dayIndex, slotIndex));
      }
    }
  }

  return selection;
}

function selectionMapToSlots(selection: Set<string>) {
  const results: TimeSlot[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    let rangeStart: number | null = null;

    for (let slotIndex = 0; slotIndex < CELLS_PER_DAY; slotIndex += 1) {
      const isSelected = selection.has(cellKey(dayIndex, slotIndex));
      const isLastCell = slotIndex === CELLS_PER_DAY - 1;

      if (isSelected && rangeStart === null) {
        rangeStart = slotIndex;
      }

      if (rangeStart !== null && (!isSelected || isLastCell)) {
        const endIndex = isSelected && isLastCell ? slotIndex + 1 : slotIndex;
        if (endIndex > rangeStart) {
          results.push({
            day_of_week: dayIndex,
            start_time: minutesToTime(START_HOUR * 60 + rangeStart * STEP_MINUTES),
            end_time: minutesToTime(START_HOUR * 60 + endIndex * STEP_MINUTES),
          });
        }
        rangeStart = isSelected && isLastCell ? null : null;
        if (!isSelected) {
          rangeStart = null;
        }
      }
    }
  }

  return results;
}

export default function AvailabilitySettings() {
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [dragMode, setDragMode] = useState<'select' | 'erase' | null>(null);
  const isPointerDown = useRef(false);

  const cells = useMemo(() => buildCells(), []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const data = await apiJson<TimeSlot[]>('/availability/');
        setSelection(slotsToSelectionMap(data));
      } catch (error) {
        console.error('Failed to fetch availability', error);
        setFeedback('Unable to load weekly availability.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailability();
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      isPointerDown.current = false;
      setDragMode(null);
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  function updateCell(dayIndex: number, slotIndex: number, nextValue: boolean) {
    const key = cellKey(dayIndex, slotIndex);
    setSelection((prev) => {
      const next = new Set(prev);
      if (nextValue) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function handleCellMouseDown(dayIndex: number, slotIndex: number) {
    const key = cellKey(dayIndex, slotIndex);
    const currentlySelected = selection.has(key);
    isPointerDown.current = true;
    setDragMode(currentlySelected ? 'erase' : 'select');
    updateCell(dayIndex, slotIndex, !currentlySelected);
  }

  function handleCellMouseEnter(dayIndex: number, slotIndex: number) {
    if (!isPointerDown.current || !dragMode) return;
    updateCell(dayIndex, slotIndex, dragMode === 'select');
  }

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback('');

    try {
      const payload = selectionMapToSlots(selection);
      await apiJson<TimeSlot[]>('/availability/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setFeedback('Working hours saved successfully.');
    } catch (error) {
      console.error(error);
      setFeedback(error instanceof Error ? error.message : 'Failed to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = selection.size;
  const days = Array.from({ length: 7 }, (_, dayIndex) => dayIndex);
  const slotRows = Array.from({ length: CELLS_PER_DAY }, (_, slotIndex) => slotIndex);

  if (isLoading) return <div className="p-8 text-slate-400">Loading schedule...</div>;

  return (
    <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Weekly Availability</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Drag across the grid to paint the times you are available.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {selectedCount} time blocks selected
        </div>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-[#5c433a] bg-[#e8d7b8] px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-[#e8d7b8] dark:text-slate-700">
          {feedback}
        </div>
      ) : null}

      <div className="overflow-auto rounded-[24px] border border-slate-200 dark:border-slate-800">
        <div className="min-w-[900px] bg-white dark:bg-slate-950">
          <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-800">
            <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Time</div>
            {DAYS.map((day) => (
              <div key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {Array.from({ length: END_HOUR - START_HOUR }, (_, hourOffset) => {
              const hour = START_HOUR + hourOffset;
              const hourSlotIndices = [0, 1, 2, 3].map((quarter) => hourOffset * 4 + quarter);

              return (
                <div key={hour} className="grid h-[80px] grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-x-1">
                  <div className="relative flex h-full items-center justify-center border-r border-slate-200 bg-white text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500">
                    <span className="absolute inset-x-0 top-0 border-t border-slate-950 dark:border-slate-100/20" />
                    <span className="absolute inset-x-0 bottom-0 border-b border-slate-950 dark:border-slate-100/20" />
                    <span className="relative z-10 rounded-full bg-white px-2 py-0.5 leading-none shadow-sm dark:bg-slate-950">
                      {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                    </span>
                  </div>

                  {days.map((dayIndex) => (
                    <div
                      key={dayIndex}
                      className="grid h-[80px] grid-rows-4 gap-1 rounded-[10px] border-y border-black border-r border-slate-950/20 px-1 py-1 dark:border-black dark:border-slate-100/10"
                    >
                      {hourSlotIndices.map((slotIndex) => {
                        const startMinutes = START_HOUR * 60 + slotIndex * STEP_MINUTES;
                        const endMinutes = startMinutes + STEP_MINUTES;
                        const selected = selection.has(cellKey(dayIndex, slotIndex));

                        return (
                          <button
                            key={`${dayIndex}-${slotIndex}`}
                            type="button"
                            onMouseDown={() => handleCellMouseDown(dayIndex, slotIndex)}
                            onMouseEnter={() => handleCellMouseEnter(dayIndex, slotIndex)}
                            onClick={(event) => event.preventDefault()}
                            className="rounded-[7px] border-b border-black transition last:border-b-0"
                            style={{
                              backgroundColor: selected ? '#50A3A4' : '#e8d7b8',
                            }}
                            aria-label={`${DAYS[dayIndex]} ${formatLabel(startMinutes)} to ${formatLabel(endMinutes)} ${selected ? 'selected' : 'unselected'}`}
                            title={`${DAYS[dayIndex]} ${formatLabel(startMinutes)} - ${formatLabel(endMinutes)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#50A3A4]" /> Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#e8d7b8] ring-1 ring-black/20" /> Unavailable
          </span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-[#50A3A4] px-6 py-2.5 font-medium text-white transition hover:bg-[#439293] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </section>
  );
}
