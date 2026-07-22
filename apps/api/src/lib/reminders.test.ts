import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideReminder, type ReminderPolicy } from './reminders.js';

const policy: ReminderPolicy = {
  enabled: true,
  firstAfterHours: 24,
  repeatEveryHours: 48,
  max: 3,
};

const HOUR = 60 * 60 * 1000;
const base = {
  status: 'SENT',
  lastReminderAt: null as Date | null,
  hasEmail: true,
};

test('first reminder fires only after firstAfterHours', () => {
  const sentAt = new Date('2026-01-01T00:00:00Z');
  const justSent = decideReminder(
    { ...base, sentAt, reminderCount: 0 },
    policy,
    new Date(sentAt.getTime() + 1 * HOUR),
  );
  assert.deepEqual(justSent, { send: false, reason: 'too_soon' });

  const due = decideReminder(
    { ...base, sentAt, reminderCount: 0 },
    policy,
    new Date(sentAt.getTime() + 25 * HOUR),
  );
  assert.deepEqual(due, { send: true });
});

test('subsequent reminders are paced from lastReminderAt', () => {
  const sentAt = new Date('2026-01-01T00:00:00Z');
  const lastReminderAt = new Date('2026-01-02T00:00:00Z');
  const tooSoon = decideReminder(
    { ...base, sentAt, lastReminderAt, reminderCount: 1 },
    policy,
    new Date(lastReminderAt.getTime() + 10 * HOUR),
  );
  assert.equal(tooSoon.send, false);

  const due = decideReminder(
    { ...base, sentAt, lastReminderAt, reminderCount: 1 },
    policy,
    new Date(lastReminderAt.getTime() + 49 * HOUR),
  );
  assert.deepEqual(due, { send: true });
});

test('cap is enforced', () => {
  const sentAt = new Date('2026-01-01T00:00:00Z');
  const res = decideReminder(
    { ...base, sentAt, reminderCount: 3 },
    policy,
    new Date(sentAt.getTime() + 999 * HOUR),
  );
  assert.deepEqual(res, { send: false, reason: 'cap_reached' });
});

test('never sends when disabled, not pending, or without an e-mail', () => {
  const sentAt = new Date('2026-01-01T00:00:00Z');
  const now = new Date(sentAt.getTime() + 999 * HOUR);
  assert.equal(
    decideReminder({ ...base, sentAt, reminderCount: 0 }, { ...policy, enabled: false }, now).send,
    false,
  );
  assert.equal(
    decideReminder({ ...base, status: 'APPROVED', sentAt, reminderCount: 0 }, policy, now).send,
    false,
  );
  assert.equal(
    decideReminder({ ...base, hasEmail: false, sentAt, reminderCount: 0 }, policy, now).send,
    false,
  );
});

test('a case that was never sent is skipped', () => {
  const res = decideReminder({ ...base, sentAt: null, reminderCount: 0 }, policy, new Date());
  assert.deepEqual(res, { send: false, reason: 'never_sent' });
});
