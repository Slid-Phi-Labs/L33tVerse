/**
 * Chase-sequence schedule (dependency-free, offline-testable).
 * Simple 3-step sequence: day 0 email, day 3 email, day 7 email.
 * Route handlers in app/api/chase/route.ts persist these rows.
 */

export type ChaseStep = { step: number; channel: string; delay_days: number };

export const CHASE_STEPS: ChaseStep[] = [
  { step: 1, channel: "email", delay_days: 0 },
  { step: 2, channel: "email", delay_days: 3 },
  { step: 3, channel: "email", delay_days: 7 },
];

export type ScheduledChase = {
  invoice_id: string;
  step: number;
  channel: string;
  scheduled_at: string;
  status: "pending";
};

export function buildChaseSchedule(invoice_id: string, nowMs: number = Date.now()): ScheduledChase[] {
  return CHASE_STEPS.map((s) => {
    const scheduled = new Date(nowMs);
    scheduled.setDate(scheduled.getDate() + s.delay_days);
    return {
      invoice_id,
      step: s.step,
      channel: s.channel,
      scheduled_at: scheduled.toISOString(),
      status: "pending" as const,
    };
  });
}
