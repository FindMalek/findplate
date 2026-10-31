import { LayoutDashboardIcon, NotebookPenIcon, SettingsIcon, UsersIcon } from "lucide-react"
import type { Route } from "next"

export interface NavItem {
  href: Route
  label: string
  icon: typeof LayoutDashboardIcon
  admin?: boolean
}

/** The sidebar and the command palette both read this list, so a module adds its page here once. */
export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/notes", label: "Notes", icon: NotebookPenIcon },
  { href: "/billing", label: "Billing", icon: SettingsIcon }, // @findplate:billing
  { href: "/users", label: "Users", icon: UsersIcon, admin: true },
  { href: "/waitlist", label: "Waitlist", icon: UsersIcon, admin: true }, // @findplate:waitlist
  { href: "/flags", label: "Flags", icon: SettingsIcon, admin: true }, // @findplate:flags
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export const visibleNav = (role: string | null): NavItem[] => NAV.filter((item) => !item.admin || role === "admin")
