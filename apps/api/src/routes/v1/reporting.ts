/**
 * Operational reporting & insights for a workspace (tenant-scoped, read-only).
 *
 *   GET /api/v1/reporting/summary     metrics + trends for a period
 *   GET /api/v1/reporting/export.csv  cases in the period as CSV
 *
 * All aggregation lives in pure, unit-tested helpers (lib/reporting.ts); the
 * route only gathers rows and shapes the response. Period via ?period=7d|30d|90d
 * or ?from=&to= (ISO). Metrics are scoped to cases *created* in the period.
 */
import type { FastifyInstance } from 'fastify';
import { formatPriceBand } from '@saf/ui';
import { prisma } from '@saf/db';
import { ok } from '../../lib/envelope.js';
import {
  resolvePeriod,
  approvalBreakdown,
  revenueRange,
  itemsByCategory,
  mean,
  median,
  round1,
  makeBuckets,
  pickGranularity,
  countIntoBuckets,
  toCsv,
} from '../../lib/reporting.js';

interface ReportQuery {
  period?: string;
  from?: string;
  to?: string;
}

/** Load the cases (with items) needed for the period's metrics. */
async function loadCases(tenantId: string, from: Date, to: Date) {
  return prisma.approvalCase.findMany({
    where: { tenantId, createdAt: { gte: from, lte: to } },
    select: {
      id: true,
      reference: true,
      subject: true,
      status: true,
      createdAt: true,
      sentAt: true,
      respondedAt: true,
      customer: { select: { name: true } },
      items: { select: { decision: true, category: true, priceMinMinor: true, priceMaxMinor: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function reportingRoutes(app: FastifyInstance) {
  app.get(
    '/reporting/summary',
    {
      preHandler: app.requirePermission('reporting:read'),
      schema: {
        tags: ['reporting'],
        summary: 'Key metrics, revenue and trends for a period',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d', '365d'] },
            from: { type: 'string' },
            to: { type: 'string' },
          },
        },
      },
    },
    async (req) => {
      const tenantId = req.auth!.tenantId;
      const period = resolvePeriod(req.query as ReportQuery);
      const cases = await loadCases(tenantId, period.from, period.to);

      const breakdown = approvalBreakdown(cases.map((c) => c.status));
      const revenue = revenueRange(cases);
      const categories = itemsByCategory(cases.flatMap((c) => c.items));

      // Response times (sent → responded), in hours, for cases with both stamps.
      const responseHours = cases
        .filter((c) => c.sentAt && c.respondedAt)
        .map((c) => (c.respondedAt!.getTime() - c.sentAt!.getTime()) / 3_600_000)
        .filter((h) => h >= 0);

      // Trend: cases created + sent per bucket.
      const granularity = pickGranularity(period.from, period.to);
      const buckets = makeBuckets(period.from, period.to, granularity);
      const createdSeries = countIntoBuckets(cases.map((c) => c.createdAt), buckets);
      const sentSeries = countIntoBuckets(
        cases.filter((c) => c.sentAt).map((c) => c.sentAt!),
        buckets,
      );

      const pending = ['SENT', 'VIEWED', 'CALLBACK'].reduce(
        (n, s) => n + cases.filter((c) => c.status === s).length,
        0,
      );

      return ok({
        period: { from: period.from.toISOString(), to: period.to.toISOString(), preset: period.preset, granularity },
        totals: {
          all: cases.length,
          draft: cases.filter((c) => c.status === 'DRAFT').length,
          sent: cases.filter((c) => c.sentAt).length,
          pending,
          approved: breakdown.approved,
          partiallyApproved: breakdown.partiallyApproved,
          declined: breakdown.declined,
          callback: breakdown.callback,
          expired: cases.filter((c) => c.status === 'EXPIRED').length,
          cancelled: cases.filter((c) => c.status === 'CANCELLED').length,
        },
        approvalRate: breakdown.approvalRate,
        responseHours: {
          avg: round1(mean(responseHours)),
          median: round1(median(responseHours)),
          count: responseHours.length,
        },
        revenue: {
          minMinor: revenue.minMinor,
          maxMinor: revenue.maxMinor,
          approvedItems: revenue.approvedItems,
          display: formatPriceBand(revenue.minMinor || null, revenue.maxMinor || null, 'CHF'),
        },
        categories: categories.map((c) => ({
          category: c.category,
          count: c.count,
          display: formatPriceBand(c.minMinor || null, c.maxMinor || null, 'CHF'),
        })),
        trend: {
          granularity,
          buckets: buckets.map((b, i) => ({
            label: b.label,
            created: createdSeries[i] ?? 0,
            sent: sentSeries[i] ?? 0,
          })),
        },
      });
    },
  );

  // --- CSV export ----------------------------------------------------------
  app.get(
    '/reporting/export.csv',
    {
      preHandler: app.requirePermission('reporting:read'),
      schema: {
        tags: ['reporting'],
        summary: 'Export the period’s cases as CSV',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['7d', '30d', '90d', '365d'] },
            from: { type: 'string' },
            to: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const tenantId = req.auth!.tenantId;
      const period = resolvePeriod(req.query as ReportQuery);
      const cases = await loadCases(tenantId, period.from, period.to);

      const header = [
        'reference',
        'subject',
        'customer',
        'status',
        'createdAt',
        'sentAt',
        'respondedAt',
        'responseHours',
        'approvedMinMinor',
        'approvedMaxMinor',
      ];
      const rows = cases.map((c) => {
        const rev = revenueRange([c]);
        const responseH =
          c.sentAt && c.respondedAt
            ? round1((c.respondedAt.getTime() - c.sentAt.getTime()) / 3_600_000)
            : '';
        return [
          c.reference,
          c.subject,
          c.customer?.name ?? '',
          c.status,
          c.createdAt.toISOString(),
          c.sentAt?.toISOString() ?? '',
          c.respondedAt?.toISOString() ?? '',
          responseH,
          rev.minMinor,
          rev.maxMinor,
        ];
      });

      const csv = toCsv(header, rows);
      const fname = `saf-report-${period.from.toISOString().slice(0, 10)}_${period.to
        .toISOString()
        .slice(0, 10)}.csv`;
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${fname}"`)
        .send(csv);
    },
  );
}
