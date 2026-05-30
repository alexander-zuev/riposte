import type { DisputeCaseListItem, DisputeCaseSortField, ListDisputeCases } from '@riposte/core'
import { ACTIONABLE_DISPUTE_CASE_WORKFLOW_STATUSES, DatabaseError } from '@riposte/core'
import { DisputeCase } from '@server/domain/disputes'
import type {
  DisputeCaseListPage,
  IDisputeCaseRepository,
} from '@server/domain/repository/interfaces'
import type { DbDisputeCase, DbNewDisputeCase, DrizzleDb } from '@server/infrastructure/db'
import { disputeCases } from '@server/infrastructure/db'
import { Result } from 'better-result'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { BaseRepository } from './base.repository'

type ListDisputeCasesInput = Omit<ListDisputeCases, 'type' | 'name'>
type ListDisputeCaseFilters = NonNullable<ListDisputeCasesInput['filters']>
type ListDisputeCaseCursor = NonNullable<ListDisputeCasesInput['cursor']>
const noEvidenceDeadlineSortValue = '9999-12-31T23:59:59.999Z'

export class DisputeCaseRepository extends BaseRepository implements IDisputeCaseRepository {
  constructor(private readonly db: DrizzleDb) {
    super()
  }

  async findById(id: string): Promise<Result<DisputeCase | null, DatabaseError>> {
    const found = await Result.tryPromise({
      try: async () => {
        const [caseRow] = await this.db.select().from(disputeCases).where(eq(disputeCases.id, id))

        return caseRow ?? null
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to find dispute case', cause }),
    })

    return found.map((row) => (row ? DisputeCase.deserialize(row) : null))
  }

  async findByIds(
    ids: readonly string[],
  ): Promise<Result<Map<string, DisputeCase>, DatabaseError>> {
    if (ids.length === 0) return Result.ok(new Map())

    const found = await Result.tryPromise({
      try: async () => {
        return await this.db
          .select()
          .from(disputeCases)
          .where(inArray(disputeCases.id, [...ids]))
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to find dispute cases', cause }),
    })

    if (found.isErr()) return Result.err(found.error)

    return Result.ok(new Map(found.value.map((row) => [row.id, DisputeCase.deserialize(row)])))
  }

  async listForUser(
    input: ListDisputeCasesInput,
  ): Promise<Result<DisputeCaseListPage, DatabaseError>> {
    const listed = await Result.tryPromise({
      try: async () => {
        const sortColumn = getSortColumn(input.sort.field)
        const where = [
          eq(disputeCases.userId, input.userId),
          eq(disputeCases.productId, input.productId),
          ...getStatusFilter(input.filters?.statuses),
          ...getCursorFilter(input.cursor, input.sort.field, input.sort.direction),
        ]
        const rows = await this.db
          .select()
          .from(disputeCases)
          .where(and(...where))
          .orderBy(
            input.sort.direction === 'asc' ? asc(sortColumn) : desc(sortColumn),
            input.sort.direction === 'asc' ? asc(disputeCases.id) : desc(disputeCases.id),
          )
          .limit(input.limit + 1)

        const visibleRows = rows.slice(0, input.limit)
        const lastVisibleRow = visibleRows.at(-1)

        return {
          items: visibleRows.map(toDisputeCaseListItem),
          nextCursor:
            rows.length > input.limit && lastVisibleRow
              ? {
                  sortValue: getSortValue(lastVisibleRow, input.sort.field),
                  id: lastVisibleRow.id,
                }
              : null,
        }
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to list dispute cases', cause }),
    })

    return listed
  }

  async countActionableForProduct(input: {
    userId: ListDisputeCasesInput['userId']
    productId: ListDisputeCasesInput['productId']
  }): Promise<Result<number, DatabaseError>> {
    return await Result.tryPromise({
      try: async () => {
        const [row] = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(disputeCases)
          .where(
            and(
              eq(disputeCases.userId, input.userId),
              eq(disputeCases.productId, input.productId),
              inArray(
                sql<string>`${disputeCases.workflowState}->>'status'`,
                ACTIONABLE_DISPUTE_CASE_WORKFLOW_STATUSES,
              ),
            ),
          )

        return row?.count ?? 0
      },
      catch: (cause) =>
        new DatabaseError({ message: 'Failed to count actionable dispute cases', cause }),
    })
  }

  async save(disputeCase: DisputeCase): Promise<Result<DisputeCase, DatabaseError>> {
    const snapshot = disputeCase.serialize()
    const row = snapshot satisfies DbNewDisputeCase

    const saved = await Result.tryPromise({
      try: async () => {
        const [caseRow] = await this.db
          .insert(disputeCases)
          .values(row)
          .onConflictDoUpdate({
            target: disputeCases.id,
            set: {
              userId: row.userId,
              productId: row.productId,
              stripeAccountId: row.stripeAccountId,
              sourceStripeEventId: row.sourceStripeEventId,
              sourceStripeEventType: row.sourceStripeEventType,
              livemode: row.livemode,
              stripeStatus: row.stripeStatus,
              reason: row.reason,
              amountMinor: row.amountMinor,
              currency: row.currency,
              charge: row.charge,
              paymentIntent: row.paymentIntent,
              paymentMethodDetailsType: row.paymentMethodDetailsType,
              paymentMethodDetailsCardBrand: row.paymentMethodDetailsCardBrand,
              paymentMethodDetailsCardCaseType: row.paymentMethodDetailsCardCaseType,
              paymentMethodDetailsCardNetworkReasonCode:
                row.paymentMethodDetailsCardNetworkReasonCode,
              customerPurchaseIp: row.customerPurchaseIp,
              metadata: row.metadata,
              balanceTransaction: row.balanceTransaction,
              balanceTransactions: row.balanceTransactions,
              evidence: row.evidence,
              enhancedEligibilityTypes: row.enhancedEligibilityTypes,
              evidenceDetailsEnhancedEligibility: row.evidenceDetailsEnhancedEligibility,
              evidenceDetailsDueBy: row.evidenceDetailsDueBy,
              evidenceDetailsHasEvidence: row.evidenceDetailsHasEvidence,
              evidenceDetailsPastDue: row.evidenceDetailsPastDue,
              evidenceDetailsSubmissionCount: row.evidenceDetailsSubmissionCount,
              isChargeRefundable: row.isChargeRefundable,
              workflowState: row.workflowState,
              updatedAt: row.updatedAt,
            },
          })
          .returning()

        if (!caseRow) throw new Error('Dispute case save returned no rows')
        this.dispatchEvents(disputeCase)
        return caseRow
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to save dispute case', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(DisputeCase.deserialize(saved.value))
  }

  async saveBatch(disputeCaseBatch: readonly DisputeCase[]): Promise<Result<void, DatabaseError>> {
    if (disputeCaseBatch.length === 0) return Result.ok(undefined)

    const rows = disputeCaseBatch.map(
      (disputeCase) => disputeCase.serialize() satisfies DbNewDisputeCase,
    )

    const saved = await Result.tryPromise({
      try: async () => {
        await this.db
          .insert(disputeCases)
          .values(rows)
          .onConflictDoUpdate({
            target: disputeCases.id,
            set: {
              userId: sql`excluded.user_id`,
              productId: sql`excluded.product_id`,
              stripeAccountId: sql`excluded.stripe_account_id`,
              sourceStripeEventId: sql`excluded.source_stripe_event_id`,
              sourceStripeEventType: sql`excluded.source_stripe_event_type`,
              livemode: sql`excluded.livemode`,
              stripeStatus: sql`excluded.stripe_status`,
              reason: sql`excluded.reason`,
              amountMinor: sql`excluded.amount_minor`,
              currency: sql`excluded.currency`,
              charge: sql`excluded.charge`,
              paymentIntent: sql`excluded.payment_intent`,
              paymentMethodDetailsType: sql`excluded.payment_method_details_type`,
              paymentMethodDetailsCardBrand: sql`excluded.payment_method_details_card_brand`,
              paymentMethodDetailsCardCaseType: sql`excluded.payment_method_details_card_case_type`,
              paymentMethodDetailsCardNetworkReasonCode: sql`excluded.payment_method_details_card_network_reason_code`,
              customerPurchaseIp: sql`excluded.customer_purchase_ip`,
              metadata: sql`excluded.metadata`,
              balanceTransaction: sql`excluded.balance_transaction`,
              balanceTransactions: sql`excluded.balance_transactions`,
              evidence: sql`excluded.evidence`,
              enhancedEligibilityTypes: sql`excluded.enhanced_eligibility_types`,
              evidenceDetailsEnhancedEligibility: sql`excluded.evidence_details_enhanced_eligibility`,
              evidenceDetailsDueBy: sql`excluded.evidence_details_due_by`,
              evidenceDetailsHasEvidence: sql`excluded.evidence_details_has_evidence`,
              evidenceDetailsPastDue: sql`excluded.evidence_details_past_due`,
              evidenceDetailsSubmissionCount: sql`excluded.evidence_details_submission_count`,
              isChargeRefundable: sql`excluded.is_charge_refundable`,
              workflowState: sql`excluded.workflow_state`,
              updatedAt: sql`excluded.updated_at`,
            },
          })

        for (const disputeCase of disputeCaseBatch) {
          this.dispatchEvents(disputeCase)
        }
      },
      catch: (cause) => new DatabaseError({ message: 'Failed to save dispute cases', cause }),
    })

    if (saved.isErr()) return Result.err(saved.error)
    return Result.ok(undefined)
  }
}

function getStatusFilter(statuses: ListDisputeCaseFilters['statuses'] = []) {
  if (statuses.length === 0) return []

  return [inArray(sql<string>`${disputeCases.workflowState}->>'status'`, statuses)]
}

function getCursorFilter(
  cursor: ListDisputeCasesInput['cursor'],
  sortField: DisputeCaseSortField,
  direction: ListDisputeCases['sort']['direction'],
) {
  if (!cursor) return []

  const sortColumn = getSortColumn(sortField)
  const sortValue = normalizeCursorSortValue(cursor.sortValue, sortField)
  const comparator =
    direction === 'asc'
      ? sql`(${sortColumn} > ${sortValue} OR (${sortColumn} = ${sortValue} AND ${disputeCases.id} > ${cursor.id}))`
      : sql`(${sortColumn} < ${sortValue} OR (${sortColumn} = ${sortValue} AND ${disputeCases.id} < ${cursor.id}))`

  return [comparator]
}

function getSortColumn(sortField: DisputeCaseSortField) {
  if (sortField === 'evidenceDueBy') {
    return sql`coalesce(${disputeCases.evidenceDetailsDueBy}, ${noEvidenceDeadlineSortValue}::timestamptz)`
  }
  if (sortField === 'stripeCreatedAt') return disputeCases.stripeCreatedAt

  return disputeCases.amountMinor
}

function getSortValue(row: DbDisputeCase, sortField: DisputeCaseSortField) {
  if (sortField === 'amount') return row.amountMinor
  if (sortField === 'stripeCreatedAt') return row.stripeCreatedAt.toISOString()

  return row.evidenceDetailsDueBy?.toISOString() ?? noEvidenceDeadlineSortValue
}

function normalizeCursorSortValue(
  sortValue: ListDisputeCaseCursor['sortValue'],
  sortField: DisputeCaseSortField,
) {
  if (sortField === 'amount') return sql`${sortValue}`

  return sql`${String(sortValue)}::timestamptz`
}

function toDisputeCaseListItem(row: DbDisputeCase): DisputeCaseListItem {
  return {
    disputeId: row.id,
    customerEmail: stringValue(row.evidence.customer_email_address),
    customerName: stringValue(row.evidence.customer_name),
    workflowStatus: row.workflowState.status,
    contestDecision: row.contestDecision.status,
    stripeStatus: row.stripeStatus,
    reason: row.reason,
    amount: {
      amountMinor: row.amountMinor,
      currency: row.currency,
    },
    evidenceDueBy: row.evidenceDetailsDueBy?.toISOString() ?? null,
    stripeCreatedAt: row.stripeCreatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}
