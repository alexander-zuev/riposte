import type {
  DisputeCaseListItem,
  DisputeCaseSortField,
  ListDisputeCases,
  ListDisputeCasesResult,
} from '@riposte/core'
import { DatabaseError } from '@riposte/core'
import { DisputeCase } from '@server/domain/disputes'
import type { IDisputeCaseRepository } from '@server/domain/repository/interfaces'
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

  async listForUser(
    input: ListDisputeCasesInput,
  ): Promise<Result<ListDisputeCasesResult, DatabaseError>> {
    const listed = await Result.tryPromise({
      try: async () => {
        const sortColumn = getSortColumn(input.sort.field)
        const where = [
          eq(disputeCases.userId, input.userId),
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
