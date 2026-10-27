import { Card, CardContent } from "@acme/ui/components/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@acme/ui/components/table"
import type { Metadata } from "next"
import { LocalDate } from "@/components/local-date"
import { PageHeader } from "@/components/page-header"
import { call } from "@/lib/api"

export const metadata: Metadata = { title: "Waitlist" }

export default async function WaitlistPage() {
  const { total, entries } = await call((api) => api.waitlist.list())
  return (
    <>
      <PageHeader title="Waitlist" description={`${total} signups. Admins only.`} />
      <div className="p-4 md:p-6">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
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
