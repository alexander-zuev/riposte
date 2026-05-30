import type { ProductEvidenceFields, ServiceStartRule } from '@riposte/core/client'
import { CompletenessBadge, IncompleteList } from '@web/features/products/completeness'
import { Card, CardContent } from '@web/ui/components/ui/card'

const SERVICE_START_RULE_LABEL: Record<ServiceStartRule, string> = {
  verified_usage: 'Verified usage',
  access_granted: 'Access granted',
  billing_time: 'Billing time',
}

/**
 * Read-only view of the product-level facts the agent sends to Stripe on every dispute. Values are
 * authored by the agent in chat; shown here as a plain fact list.
 */
export function ProductEvidenceSection({ evidence }: { evidence: ProductEvidenceFields }) {
  const facts = [
    {
      label: 'Service date rule',
      value: evidence.serviceStartRule ? SERVICE_START_RULE_LABEL[evidence.serviceStartRule] : null,
      field: 'service_date',
    },
    {
      label: 'Product description',
      value: evidence.productDescription,
      field: 'product_description',
    },
    {
      label: 'Refund policy disclosure',
      value: evidence.refundPolicyDisclosure,
      field: 'refund_policy_disclosure',
    },
    {
      label: 'Cancellation policy disclosure',
      value: evidence.cancellationPolicyDisclosure,
      field: 'cancellation_policy_disclosure',
    },
  ]
  const missing = facts.filter((fact) => fact.value === null).map((fact) => fact.label)

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
        <CardContent className="grid gap-5">
          {facts.map((fact) => (
            <Fact key={fact.field} label={fact.label} value={fact.value} field={fact.field} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

function Fact({ label, value, field }: { label: string; value: string | null; field: string }) {
  return (
    <div className="grid gap-1">
      <p className="font-medium">{label}</p>
      {value ? (
        <p className="whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-muted-foreground">Not set yet</p>
      )}
      <small className="text-muted-foreground">
        Maps to Stripe evidence field <code>{field}</code>
      </small>
    </div>
  )
}
