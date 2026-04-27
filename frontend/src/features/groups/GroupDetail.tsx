import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getGroup,
  getGroupAvailability,
  removeGroupMember,
  transferGroupOwnership,
  type GroupAvailability,
  type GroupDetail as GroupDetailType,
} from './groups.api';
import GroupAvailabilityCalendar from './GroupAvailabilityCalendar';

export default function GroupDetail() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [group, setGroup] = useState<GroupDetailType | null>(null);
  const [availability, setAvailability] = useState<GroupAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [copied, setCopied] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState('');

  useEffect(() => {
    const loadGroup = async () => {
      const id = Number(groupId);
      if (!Number.isInteger(id) || id <= 0) {
        setError('Invalid group link.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await getGroup(id);
        setGroup(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load group details.';
        if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('not authenticated')) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroup();
  }, [groupId, navigate]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!group) {
        setAvailability(null);
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError('');

      try {
        const data = await getGroupAvailability(group.id);
        setAvailability(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load group availability.';
        setAvailabilityError(message);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    loadAvailability();
  }, [group]);

  if (isLoading) return <div className="p-8 text-slate-400">Loading group details...</div>;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          Back to groups
        </button>
      </div>
    );
  }

  if (!group) return null;

  const inviteToken = String(group.id).padStart(9, '0');
  const filteredMembers = group.members.filter((member) => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${member.firstName} ${member.lastName}`.toLowerCase().includes(keyword);
  });

  async function refreshGroupAndAvailability() {
    const latestGroup = await getGroup(group.id);
    setGroup(latestGroup);

    try {
      const latestAvailability = await getGroupAvailability(latestGroup.id);
      setAvailability(latestAvailability);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load group availability.';
      setAvailabilityError(message);
    }
  }

  async function handleTransferOwnership(memberId: number) {
    if (!group) return;
    setMemberActionLoading(true);
    setMemberActionError('');

    try {
      await transferGroupOwnership(group.id, { newOwnerId: memberId });
      setActiveMemberId(null);
      await refreshGroupAndAvailability();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transfer ownership.';
      setMemberActionError(message);
    } finally {
      setMemberActionLoading(false);
    }
  }

  async function handleRemoveMember(memberId: number) {
    if (!group) return;
    setMemberActionLoading(true);
    setMemberActionError('');

    try {
      await removeGroupMember(group.id, memberId);
      setActiveMemberId(null);
      await refreshGroupAndAvailability();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member.';
      setMemberActionError(message);
    } finally {
      setMemberActionLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="mb-3 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            ← Back to groups
          </button>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            {group.description || 'No description provided for this group.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Your role</p>
          <p className="mt-1 text-lg font-semibold capitalize text-slate-900 dark:text-white">{group.role}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{group.memberCount} members</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Members</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                People currently included in this group.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {group.memberCount}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            {memberActionError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                {memberActionError}
              </div>
            ) : null}

            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (group.role !== 'owner') return;
                    setActiveMemberId((current) => (current === member.id ? null : member.id));
                    setMemberActionError('');
                  }}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold capitalize text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {member.role}
                  </span>
                </button>

                {group.role === 'owner' && activeMemberId === member.id ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleTransferOwnership(member.id)}
                      disabled={memberActionLoading || member.role === 'owner'}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Make owner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={memberActionLoading || member.role === 'owner'}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove member
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {filteredMembers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No members match your search.
                </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Invite token</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Share this token so another user can join the group.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg tracking-[0.35em] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {inviteToken}
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteToken);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              {copied ? 'Copied!' : 'Copy token'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Next step</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Connect this group to shared availability or meeting planning once you want collaboration features.
            </p>
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Open calendar
            </button>
          </section>
        </aside>
      </div>

      {availabilityLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Loading team calendar...
        </div>
      ) : availabilityError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          {availabilityError}
        </div>
      ) : (
        <GroupAvailabilityCalendar slots={availability?.slots || []} />
      )}
    </div>
  );
}