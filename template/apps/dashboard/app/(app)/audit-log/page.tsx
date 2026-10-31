import { Button } from "@acme/ui/components/button"
import { Card, CardContent } from "@acme/ui/components/card"
import { Input } from "@acme/ui/components/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@acme/ui/components/table"
import type { Metadata } from "next"
import { LocalDate } from "@/components/local-date"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "Audit log" }

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams
  const entries = await call((api) => api.admin.audit.list({ action }))
  return (
    <>
      <PageHeader title="Audit log" description="Who did what, newest first. Admins only." />
      <div className="grid gap-4 p-4 md:p-6">
        <form className="flex max-w-sm gap-2">
          <Input name="action" defaultValue={action} placeholder="Action, e.g. note" />
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.action}</TableCell>
                    <TableCell>{entry.actorEmail ?? "system"}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.targetId ?? ""}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.ip ?? ""}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <LocalDate value={entry.createdAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
