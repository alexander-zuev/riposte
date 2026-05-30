import type { ProductEvidenceFields, ServiceStartRule } from '@riposte/core/client'
import { CompletenessBadge, IncompleteList } from '@web/features/products/completeness'
import { Card, CardContent } from '@web/ui/components/ui/card'
import { Markdown } from '@web/ui/components/ui/markdown'

const SERVICE_START_RULE_LABEL: Record<ServiceStartRule, string> = {
  verified_usage: 'Verified usage',
  access_granted: 'Access granted',
  billing_time: 'Billing time',
}

const NOT_SET = '_Not set yet_'

/**
 * Read-only view of the product-level facts the agent sends to Stripe on every dispute. Written as
 * markdown and rendered through the same renderer as the playbook so both sections share one visual
 * language. Values are authored elsewhere (agent chat).
 */
export function ProductEvidenceSection({ evidence }: { evidence: ProductEvidenceFields }) {
  const serviceRule = evidence.serviceStartRule
    ? SERVICE_START_RULE_LABEL[evidence.serviceStartRule]
    : null

  const missing = [
    serviceRule === null ? 'Service date rule' : null,
    evidence.productDescription === null ? 'Product description' : null,
    evidence.refundPolicyDisclosure === null ? 'Refund policy disclosure' : null,
    evidence.cancellationPolicyDisclosure === null ? 'Cancellation policy disclosure' : null,
  ].filter((label): label is string => label !== null)

  const markdown = `## Service date rule

> ${serviceRule ?? NOT_SET}

Maps to Stripe evidence field \`service_date\`

## Product description

> ${evidence.productDescription ?? NOT_SET}

Maps to Stripe evidence field \`product_description\`

## Refund policy disclosure

> ${evidence.refundPolicyDisclosure ?? NOT_SET}

Maps to Stripe evidence field \`refund_policy_disclosure\`

## Cancellation policy disclosure

> ${evidence.cancellationPolicyDisclosure ?? NOT_SET}

Maps to Stripe evidence field \`cancellation_policy_disclosure\``

  return (
    <section className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h3>Product facts</h3>
          <p className="text-muted-foreground">
            Facts the agent sends to Stripe in every dispute for this product
          </p>
        </div>
        <CompletenessBadge complete={missing.length === 0} />
      </div>

      {missing.length > 0 ? <IncompleteList title="Missing facts" items={missing} /> : null}

      <Card>
        <CardContent>
          <Markdown>{markdown}</Markdown>
        </CardContent>
      </Card>
    </section>
  )
}
