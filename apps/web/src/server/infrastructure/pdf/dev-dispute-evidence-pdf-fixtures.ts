import type { EvidencePacketTemplate } from '@riposte/core'
import {
  DisputeCase,
  DisputeEvidencePacket,
  StripeDisputeContext,
  type DisputeEvidencePdfDocument,
} from '@server/domain/disputes'

export type DevEvidencePdfCategory = 'fraudulent'

export const DEV_EVIDENCE_PDF_CATEGORIES: DevEvidencePdfCategory[] = ['fraudulent']

export type DevEvidencePdfCategoryDescriptor = {
  template: EvidencePacketTemplate
  label: string
  description: string
  supported: true
}

export const DEV_EVIDENCE_PDF_CATEGORY_DESCRIPTORS: DevEvidencePdfCategoryDescriptor[] = [
  {
    template: 'fraudulent_digital_goods',
    label: 'Fraudulent',
    description: 'Preview the fraud evidence packet generated from domain dispute facts',
    supported: true,
  },
]

export type DevEvidencePdfPreview = {
  category: DevEvidencePdfCategory
  disputeCase: DisputeCase
  disputeContext: StripeDisputeContext
  evidencePacket: DisputeEvidencePacket
  document: DisputeEvidencePdfDocument
  branding: {
    merchantName: string
    primaryColor: string
  }
  generatedAt: Date
}

const DEV_NOW = new Date('2026-05-13T20:00:00.000Z')

export function buildDevEvidencePdfPreview(
  category: DevEvidencePdfCategory,
): DevEvidencePdfPreview {
  switch (category) {
    case 'fraudulent':
      return buildDevFraudEvidencePdfPreview()
    default:
      category satisfies never
      return buildDevFraudEvidencePdfPreview()
  }
}

function buildDevFraudEvidencePdfPreview(): DevEvidencePdfPreview {
  const disputeCase = buildDevFraudDisputeCase()
  const disputeContext = buildDevFraudDisputeContext(disputeCase.id)
  const evidencePacket = DisputeEvidencePacket.create({
    disputeCase,
    disputeContext,
    collectedEvidence: {
      accessActivityLog:
        'The customer account accessed the digital service after payment. Server activity shows authenticated access from a consistent device and network profile after the charge succeeded.',
      rebuttalText:
        'Based on payment method verification, customer identity signals, account access, and prior transaction history, the evidence supports that the legitimate cardholder authorized and used the purchased service.',
    },
    previousPacket: null,
  })
  if (evidencePacket.isErr()) throw evidencePacket.error

  return {
    category: 'fraudulent',
    disputeCase,
    disputeContext,
    evidencePacket: evidencePacket.value,
    document: evidencePacket.value.pdfDocument,
    branding: {
      merchantName: 'Typist',
      primaryColor: '#2563EB',
    },
    generatedAt: DEV_NOW,
  }
}

function buildDevFraudDisputeCase(): DisputeCase {
  const received = DisputeCase.receiveStripeDispute({
    userId: '018f5b64-196b-7b6c-b001-6e1a62f98a01',
    stripeAccountId: 'acct_1Rsq0qDGi8KWRsUN',
    sourceStripeEventId: 'evt_1TWeDuDGi8KWRsUNexample',
    sourceStripeEventType: 'charge.dispute.created',
    now: DEV_NOW,
    stripeDispute: {
      id: 'du_1TWeDuDGi8KWRsUNqehBjtRc',
      amount: 3200,
      charge: 'ch_3TWeDtDGi8KWRsUN1iW7Xydq',
      created: Math.floor(DEV_NOW.getTime() / 1000),
      currency: 'usd',
      balance_transaction: null,
      balance_transactions: [],
      metadata: {},
      enhanced_eligibility_types: [],
      is_charge_refundable: true,
      livemode: false,
      payment_intent: 'pi_3TWeDtDGi8KWRsUN1vdunqfS',
      payment_method_details: {
        type: 'card',
        card: {
          brand: 'visa',
          case_type: null,
          network_reason_code: '10.4',
        },
      },
      reason: 'fraudulent',
      status: 'needs_response',
      evidence_details: {
        due_by: Math.floor(new Date('2026-05-22T00:00:00.000Z').getTime() / 1000),
        enhanced_eligibility: {},
        has_evidence: false,
        past_due: false,
        submission_count: 0,
      },
      evidence: {
        customer_name: 'Alexander Zuev',
        customer_email_address: 'alexander@example.test',
        customer_purchase_ip: '62.238.20.76',
      },
    },
  })

  if (received.isErr()) throw received.error

  return received.value
}

function buildDevFraudDisputeContext(disputeCaseId: string): StripeDisputeContext {
  return StripeDisputeContext.create(
    {
      disputeCaseId,
      charge: {
        id: 'ch_3TWeDtDGi8KWRsUN1iW7Xydq',
        amount: 3200,
        amountCaptured: 3200,
        amountRefunded: 0,
        currency: 'usd',
        created: DEV_NOW,
        description: 'Test',
        calculatedStatementDescriptor: 'TYPIST',
        paymentIntent: 'pi_3TWeDtDGi8KWRsUN1vdunqfS',
        receiptUrl: null,
        refunded: false,
      },
      customer: {
        id: 'cus_RiposteDevPreview',
        email: 'alexander@example.test',
        name: 'Alexander Zuev',
      },
      card: {
        paymentMethodId: 'pm_1TWeDtDGi8KWRsUNpreview',
        brand: 'Visa',
        last4: '0259',
        network: 'visa',
        fingerprint: 'Xt5EWLLDS7FJjR1c',
        country: 'US',
        funding: 'credit',
        expMonth: 3,
        expYear: 2027,
        networkTransactionId: 'visa-dev-network-transaction',
        checks: {
          addressLine1Check: 'pass',
          addressPostalCodeCheck: 'pass',
          cvcCheck: 'pass',
        },
        threeDSecure: {
          result: 'authenticated',
          resultReason: null,
          version: '2.2.0',
        },
      },
      risk: {
        level: 'normal',
        score: 18,
        outcomeType: 'authorized',
        outcomeReason: null,
        review: null,
      },
      invoice: null,
      subscription: null,
      refunds: [],
      paymentHistory: {
        priorCharges: [
          {
            id: 'ch_prior_001',
            amount: 3200,
            amountCaptured: 3200,
            amountRefunded: 0,
            currency: 'usd',
            created: new Date('2026-04-13T20:00:00.000Z'),
            paid: true,
            disputed: false,
            refunded: false,
            card: {
              last4: '0259',
              network: 'visa',
              fingerprint: 'Xt5EWLLDS7FJjR1c',
            },
            receiptUrl: null,
          },
          {
            id: 'ch_prior_002',
            amount: 3200,
            amountCaptured: 3200,
            amountRefunded: 0,
            currency: 'usd',
            created: new Date('2026-03-13T20:00:00.000Z'),
            paid: true,
            disputed: false,
            refunded: false,
            card: {
              last4: '0259',
              network: 'visa',
              fingerprint: 'Xt5EWLLDS7FJjR1c',
            },
            receiptUrl: null,
          },
          {
            id: 'ch_prior_003',
            amount: 3200,
            amountCaptured: 3200,
            amountRefunded: 0,
            currency: 'usd',
            created: new Date('2026-02-13T20:00:00.000Z'),
            paid: true,
            disputed: false,
            refunded: false,
            card: {
              last4: '0259',
              network: 'visa',
              fingerprint: 'Xt5EWLLDS7FJjR1c',
            },
            receiptUrl: null,
          },
          {
            id: 'ch_prior_004',
            amount: 3200,
            amountCaptured: 3200,
            amountRefunded: 0,
            currency: 'usd',
            created: new Date('2026-01-13T20:00:00.000Z'),
            paid: true,
            disputed: false,
            refunded: false,
            card: {
              last4: '0259',
              network: 'visa',
              fingerprint: 'Xt5EWLLDS7FJjR1c',
            },
            receiptUrl: null,
          },
          {
            id: 'ch_prior_005',
            amount: 3200,
            amountCaptured: 3200,
            amountRefunded: 0,
            currency: 'usd',
            created: new Date('2025-12-13T20:00:00.000Z'),
            paid: true,
            disputed: false,
            refunded: false,
            card: {
              last4: '0259',
              network: 'visa',
              fingerprint: 'Xt5EWLLDS7FJjR1c',
            },
            receiptUrl: null,
          },
        ],
        totalPaidByCurrency: {
          usd: 16_000,
        },
      },
    },
    DEV_NOW,
  )
}
