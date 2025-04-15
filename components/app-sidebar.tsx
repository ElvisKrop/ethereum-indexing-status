"use client"

import * as React from "react"
import { Database, Info, LineChart, Menu, Server, X } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

interface SidebarLinkProps {
  icon: React.ElementType
  label: string
  targetId: string
  isActive?: boolean
  onClick?: () => void
}

// Create a context to share mobile sidebar state
export const MobileSidebarContext = React.createContext<{
  openMobile: boolean
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>
}>({
  openMobile: false,
  setOpenMobile: () => {},
})

// Custom hook for mobile sidebar
function useMobileSidebar() {
  const context = React.useContext(MobileSidebarContext)
  if (!context) {
    throw new Error("useMobileSidebar must be used within a MobileSidebarProvider")
  }
  return context
}

// Update the SidebarLink component to handle the SidebarContext properly
const SidebarLink = ({ icon: Icon, label, targetId, isActive, onClick }: SidebarLinkProps) => {
  // Get mobile sidebar context
  const { setOpenMobile } = useMobileSidebar()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      // Get the element's position relative to the viewport
      const elementPosition = element.getBoundingClientRect().top
      // Get the current scroll position
      const offsetPosition = elementPosition + window.pageYOffset - 30 // 30px offset

      // Scroll to the element with the offset
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })

      // Close mobile sidebar
      setOpenMobile(false)

      if (onClick) onClick()
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} onClick={handleClick} className="w-full px-0">
        <a
          href={`#${targetId}`}
          className={`flex items-center gap-3 w-full px-3 py-2 relative transition-all duration-200 rounded-md ${
            isActive
              ? "bg-cyan-900/30 text-cyan-300 font-medium"
              : "hover:bg-slate-800/70 text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-md ${
              isActive ? "bg-cyan-900/50 text-cyan-400" : "bg-slate-800/50 text-slate-500"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span>{label}</span>
          {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-cyan-400 rounded-r-sm" />}
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// Update the AppSidebar component to always show links when content is loaded
export function AppSidebar() {
  const [activeSection, setActiveSection] = React.useState<string>("")

  return (
    <Sidebar className="p-2">
      <SidebarHeader className="border-b border-slate-800/50 rounded-lg bg-slate-800/20 mb-2">
        <div className="flex items-center p-4">
          <div className="bg-blue-500 p-2.5 rounded-md mr-3 shadow-md">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Safe Indexing</h1>
            <p className="text-xs text-cyan-500">Transaction Service Monitor</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="sticky top-0 px-2">
        <div className="px-3 py-2 text-xs font-semibold text-cyan-600 uppercase tracking-wider">Navigation</div>
        <SidebarMenu className="space-y-1">
          {!SidebarWrapper.hasActiveUrl ? (
            <div className="px-3 py-4 text-sm text-slate-400 bg-slate-800/20 rounded-md">
              Enter a transaction service URL to view available sections
            </div>
          ) : (
            <>
              <SidebarLink
                icon={Info}
                label="Service Information"
                targetId="service-info"
                isActive={activeSection === "service-info"}
              />
              <SidebarLink
                icon={Info}
                label="Service Settings"
                targetId="service-settings"
                isActive={activeSection === "service-settings"}
              />
              <SidebarLink
                icon={Database}
                label="RPC Status"
                targetId="rpc-status"
                isActive={activeSection === "rpc-status"}
              />
              {SidebarWrapper.hasTracingRpc && (
                <SidebarLink
                  icon={Server}
                  label="Tracing RPC Status"
                  targetId="tracing-rpc-status"
                  isActive={activeSection === "tracing-rpc-status"}
                />
              )}
              <SidebarLink
                icon={LineChart}
                label="Indexing Data"
                targetId="indexing-data"
                isActive={activeSection === "indexing-data"}
              />
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-800/50 p-4 mt-auto rounded-lg bg-slate-800/20">
        <div className="text-xs text-slate-500">
          <p>Blockchain Indexing Status</p>
          <p className="mt-1">© 2025 Protofire</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export function MobileSidebarTrigger() {
  const { openMobile, setOpenMobile } = useMobileSidebar()

  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpenMobile(!openMobile)}>
      {openMobile ? <X className="h-6 w-6 text-slate-400" /> : <Menu className="h-6 w-6 text-slate-400" />}
      <span className="sr-only">Toggle Menu</span>
    </Button>
  )
}

// Remove the MobileSidebar component since we've integrated it directly into SidebarWrapper
export function MobileSidebar() {
  return null // This component is no longer needed
}

// Update the SidebarWrapper component to close the sidebar on outside click
export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = React.useState(false)
  const sidebarRef = React.useRef<HTMLDivElement>(null)
  const [activeSection, setActiveSection] = React.useState<string>("")

  const [hasActiveUrl, setHasActiveUrl] = React.useState(false)
  const [hasTracingRpc, setHasTracingRpc] = React.useState(false)

  // Check if we have an active URL by looking for specific elements
  React.useEffect(() => {
    const checkForActiveUrl = () => {
      // Check if we have transaction service info displayed
      const headings = document.querySelectorAll("h2")
      let found = false

      headings.forEach((heading) => {
        if (heading.textContent?.includes("Transaction Service Information")) {
          found = true
        }
      })

      // Also check for the URL display which indicates an active service
      const urlElement = document.querySelector("span.font-mono")
      if (urlElement && urlElement.textContent && urlElement.textContent !== "N/A") {
        found = true
      }

      setHasActiveUrl(found)

      // Check if tracing RPC section exists
      const tracingSection = document.getElementById("tracing-rpc-status")
      setHasTracingRpc(!!tracingSection)
    }

    // Initial check
    checkForActiveUrl()

    // Set up a mutation observer to detect when content changes
    const observer = new MutationObserver(checkForActiveUrl)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  // Set up intersection observer to detect which section is in view
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3, rootMargin: "-30px 0px 0px 0px" }, // Adjust rootMargin to account for the 30px offset
    )

    const sections = document.querySelectorAll("section[id]")
    sections.forEach((section) => observer.observe(section))

    return () => {
      sections.forEach((section) => observer.unobserve(section))
    }
  }, [])

  // Add click outside handler to close the sidebar
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMobile && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpenMobile(false)
      }
    }

    // Add event listener when sidebar is open
    if (openMobile) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openMobile])

  SidebarWrapper.hasActiveUrl = hasActiveUrl
  SidebarWrapper.hasTracingRpc = hasTracingRpc

  return (
    <MobileSidebarContext.Provider value={{ openMobile, setOpenMobile }}>
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </div>
        {openMobile && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setOpenMobile(false)}
          >
            <div
              ref={sidebarRef}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-slate-900 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarProvider>
                <div className="flex h-full flex-col p-2">
                  <div className="flex items-center justify-between p-4 border-b border-slate-800/50 rounded-lg bg-slate-800/20 mb-2">
                    <div className="flex items-center">
                      <div className="bg-blue-500 p-2.5 rounded-md mr-3 shadow-md">
                        <LineChart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-lg font-semibold text-white">Safe Indexing</h1>
                        <p className="text-xs text-cyan-500">Transaction Service Monitor</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setOpenMobile(false)}>
                      <X className="h-5 w-5 text-slate-400" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto py-2 px-2">
                    <div className="px-3 py-2 text-xs font-semibold text-cyan-600 uppercase tracking-wider">
                      Navigation
                    </div>
                    <SidebarMenu className="space-y-1">
                      {!hasActiveUrl ? (
                        <div className="px-3 py-4 text-sm text-slate-400 bg-slate-800/20 rounded-md">
                          Enter a transaction service URL to view available sections
                        </div>
                      ) : (
                        <>
                          <SidebarLink
                            icon={Info}
                            label="Service Information"
                            targetId="service-info"
                            isActive={activeSection === "service-info"}
                          />
                          <SidebarLink
                            icon={Info}
                            label="Service Settings"
                            targetId="service-settings"
                            isActive={activeSection === "service-settings"}
                          />
                          <SidebarLink
                            icon={Database}
                            label="RPC Status"
                            targetId="rpc-status"
                            isActive={activeSection === "rpc-status"}
                          />
                          {hasTracingRpc && (
                            <SidebarLink
                              icon={Server}
                              label="Tracing RPC Status"
                              targetId="tracing-rpc-status"
                              isActive={activeSection === "tracing-rpc-status"}
                            />
                          )}
                          <SidebarLink
                            icon={LineChart}
                            label="Indexing Data"
                            targetId="indexing-data"
                            isActive={activeSection === "indexing-data"}
                          />
                        </>
                      )}
                    </SidebarMenu>
                  </div>
                  <div className="border-t border-slate-800/50 p-4 rounded-lg bg-slate-800/20">
                    <div className="text-xs text-slate-500">
                      <p>Blockchain Indexing Status</p>
                      <p className="mt-1">© 2025 Protofire</p>
                    </div>
                  </div>
                </div>
              </SidebarProvider>
            </div>
          </div>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </MobileSidebarContext.Provider>
  )
}

