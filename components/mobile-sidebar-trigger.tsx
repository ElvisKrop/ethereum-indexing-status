"use client"

import React from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileSidebarContext } from "@/components/app-sidebar"

export function MobileSidebarTrigger() {
  const { openMobile, setOpenMobile } = React.useContext(MobileSidebarContext)

  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpenMobile(!openMobile)}>
      {openMobile ? <X className="h-5 w-5 text-slate-400" /> : <Menu className="h-5 w-5 text-slate-400" />}
      <span className="sr-only">Toggle Menu</span>
    </Button>
  )
}

