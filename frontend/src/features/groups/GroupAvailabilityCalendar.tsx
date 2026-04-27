import { useState } from 'react';
import type { GroupAvailabilitySlot } from './groups.api';

interface Props {
  slots: GroupAvailabilitySlot[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const PALETTE = ['#2563eb', '#0f766e', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#16a34a', '#db2777'];

export default function GroupAvailabilityCalendar({ slots }: Props) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const memberMap = new Map<number, { memberId: number; firstName: string; lastName: string; role: string; slots: GroupAvailabilitySlot[] }>();

  slots.forEach((slot) => {
    if (!memberMap.has(slot.memberId)) {
      memberMap.set(slot.memberId, {
        memberId: slot.memberId,
        firstName: slot.firstName,
        lastName: slot.lastName,
        role: slot.role,
        slots: [],
      });
    }

    memberMap.get(slot.memberId)?.slots.push(slot);
  });

  const members = Array.from(memberMap.values());

  const memberColor = new Map<number, string>();
  members.forEach((member, index) => {
    memberColor.set(member.memberId, PALETTE[index % PALETTE.length]);
  });

  function overlapsHour(slot: GroupAvailabilitySlot, hour: number) {
    const startHour = Number(slot.startTime.slice(0, 2));
    const startMinute = Number(slot.startTime.slice(3, 5));
    const endHour = Number(slot.endTime.slice(0, 2));
    const endMinute = Number(slot.endTime.slice(3, 5));
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    const slotStart = hour * 60;
    const slotEnd = slotStart + 60;
    return startTotal < slotEnd && endTotal > slotStart;
  }

  function parseTimeToMinutes(time: string) {
    const hour = Number(time.slice(0, 2));
    const minute = Number(time.slice(3, 5));
    return hour * 60 + minute;
  }

  function getHourChunk(slot: GroupAvailabilitySlot, hour: number) {
    const startTotal = parseTimeToMinutes(slot.startTime);
    const endTotal = parseTimeToMinutes(slot.endTime);
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;
    const chunkStart = Math.max(startTotal, hourStart);
    const chunkEnd = Math.min(endTotal, hourEnd);
    return {
      topPercent: ((chunkStart - hourStart) / 60) * 100,
      heightPercent: ((chunkEnd - chunkStart) / 60) * 100,
    };
  }

  function formatTime(time: string) {
    const hour = Number(time.slice(0, 2));
    const minute = time.slice(3, 5);
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${minute} ${ampm}`;
  }

  function initials(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  const weekSlots = HOURS.map((hour) => ({ hour }));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Team calendar</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Weekly availability for every member in this team.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((member, index) => (
              <span
                key={member.memberId}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: memberColor.get(member.memberId) || PALETTE[index % PALETTE.length] }}
              >
                {member.firstName} {member.lastName}
                <span className="opacity-80 capitalize">{member.role}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No availability has been added yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-200 dark:border-slate-700">
              <div />
              {DAYS.map((day) => (
                <div key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {weekSlots.map(({ hour }) => (
              <div key={hour} className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-slate-800">
                <div className="px-2 py-3 text-right text-xs font-medium text-slate-400 dark:text-slate-500">
                  {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const daySlots = slots
                    .filter((slot) => slot.dayOfWeek === dayIndex && overlapsHour(slot, hour))
                    .sort((a, b) => a.memberId - b.memberId);
                  const memberCount = Math.max(daySlots.length, 1);

                  return (
                    <div key={dayIndex} className="border-l border-slate-100 p-1 min-h-[60px] dark:border-slate-800">
                      <div
                        className="grid h-[56px] gap-1"
                        style={{ gridTemplateColumns: `repeat(${memberCount}, minmax(0, 1fr))` }}
                      >
                      {daySlots.map((slot) => {
                        const color = memberColor.get(slot.memberId) || PALETTE[0];
                        const chunk = getHourChunk(slot, hour);
                        const blockId = `${slot.memberId}-${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}-${hour}`;
                        const isActive = activeBlockId === blockId;

                        return (
                          <div key={blockId} className="relative h-full">
                            <button
                              type="button"
                              onClick={() => setActiveBlockId(isActive ? null : blockId)}
                              className="absolute left-0 w-full overflow-hidden rounded-md px-1 py-0.5 text-[10px] leading-tight text-white shadow-sm"
                              style={{
                                backgroundColor: color,
                                top: `${chunk.topPercent}%`,
                                height: `${chunk.heightPercent}%`,
                              }}
                              title={`${slot.firstName} ${slot.lastName}: ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
                            >
                              <span className="font-semibold">{initials(slot.firstName, slot.lastName)}</span>
                            </button>

                            {isActive ? (
                              <div className="absolute left-1/2 top-0 z-20 w-52 -translate-x-1/2 -translate-y-[105%] rounded-md bg-slate-900 px-2 py-1.5 text-[11px] text-white shadow-lg">
                                <div className="font-semibold">
                                  {slot.firstName} {slot.lastName}
                                </div>
                                <div className="opacity-90 capitalize">{slot.role}</div>
                                <div className="opacity-90">
                                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}