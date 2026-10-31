import { PLANS, type PlanId } from "@acme/billing/plans"
import { Badge } from "@acme/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@acme/ui/components/card"
import type { Metadata } from "next"
import { BillingActions } from "@/components/billing-actions"
import { LocalDate } from "@/components/local-date"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "Billing" }

export default async function BillingPage() {
  const billing = await call((api) => api.billing.status())
  const plan = PLANS[billing.plan as PlanId]
  return (
    <>
      <PageHeader title="Billing" description="Your plan and subscription." />
      <div className="p-4 md:p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {plan.label}
              {billing.status && <Badge variant="secondary">{billing.status}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="list-disc pl-5 text-muted-foreground text-sm">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {billing.renewsAt && (
              <p className="text-muted-foreground text-sm">
                {billing.cancelAtPeriodEnd ? "Ends" : "Renews"} <LocalDate value={billing.renewsAt} />
              </p>
            )}
            <BillingActions plan={billing.plan} configured={billing.configured} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
