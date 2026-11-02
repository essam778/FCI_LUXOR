"use client"

import * as React from "react"
import { Workflow, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MindMapNode {
  id: string
  title: string
  children?: MindMapNode[]
  note?: string
}

interface MindMapViewProps {
  title: string
  nodes?: MindMapNode[]
  mindmapMd?: string
}

export function MindMapView({ title, nodes, mindmapMd }: MindMapViewProps) {
  const [zoom, setZoom] = React.useState(1)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [activeNodeId, setActiveNodeId] = React.useState<string | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Parse markdown outline to nodes if provided
  const parsedNodes: MindMapNode[] = React.useMemo(() => {
    if (nodes && nodes.length > 0) return nodes

    if (mindmapMd) {
      const lines = mindmapMd.split("\n").filter((l) => l.trim().startsWith("#"))
      const result: MindMapNode[] = []
      let currentParent: MindMapNode | null = null

      lines.forEach((line, idx) => {
        const level = (line.match(/^#+/) || [""])[0].length
        const cleanTitle = line.replace(/^#+\s*/, "").trim()

        if (level === 2 || !currentParent) {
          const node: MindMapNode = {
            id: `node-${idx}`,
            title: cleanTitle,
            children: [],
          }
          result.push(node)
          currentParent = node
        } else if (level >= 3 && currentParent) {
          currentParent.children = currentParent.children || []
          currentParent.children.push({
            id: `node-${idx}`,
            title: cleanTitle,
          })
        }
      })

      if (result.length > 0) return result
    }

    // Default structure for demonstration
    return [
      {
        id: "1",
        title: "المفاهيم التأسيسية",
        children: [
          { id: "1-1", title: "التعريف والأهمية الأكاديمية" },
          { id: "1-2", title: "العلاقة بنظم التشغيل والمعمارية" },
        ],
      },
      {
        id: "2",
        title: "العمليات الأساسية والتعقيد",
        children: [
          { id: "2-1", title: "التعقيد الزمني Time Complexity O(1) / O(n)" },
          { id: "2-2", title: "التعقيد المكاني Space Complexity" },
        ],
      },
      {
        id: "3",
        title: "أهم مسائل الامتحانات والـ Edge Cases",
        children: [
          { id: "3-1", title: "شروط الحدود ومصفوفات الحجم الصفري" },
          { id: "3-2", title: "أسئلة شيتات المعمل المتكررة" },
        ],
      },
    ]
  }, [nodes, mindmapMd])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 transition-all relative overflow-hidden ${
        isFullscreen ? "h-screen w-screen p-8 flex flex-col justify-between" : ""
      }`}
    >
      {/* Mindmap Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Workflow className="size-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground">خريطة المفاهيم والعلاقات الذهنية</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
            className="size-8 p-0"
            title="تكبير"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
            className="size-8 p-0"
            title="تصغير"
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
            className="size-8 p-0"
            title="إعادة ضبط"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="size-8 p-0"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Interactive Mindmap Tree Graph View */}
      <div
        className="w-full min-h-[300px] overflow-auto flex items-center justify-center p-4 bg-muted/10 rounded-xl"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
      >
        <div className="flex flex-col items-center gap-6 max-w-full">
          {/* Central Root Node */}
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/90 to-primary text-primary-foreground font-black text-sm sm:text-base shadow-lg shadow-primary/20 ring-2 ring-primary/40 text-center">
            {title}
          </div>

          {/* Child Branches */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {parsedNodes.map((branch) => {
              const isActive = activeNodeId === branch.id
              return (
                <div
                  key={branch.id}
                  onClick={() => setActiveNodeId(isActive ? null : branch.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                    isActive
                      ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary shrink-0" />
                    <h5 className="font-bold text-xs sm:text-sm text-foreground">
                      {branch.title}
                    </h5>
                  </div>

                  {branch.children && branch.children.length > 0 && (
                    <div className="ps-4 space-y-1.5 border-s-2 border-primary/20">
                      {branch.children.map((sub) => (
                        <div
                          key={sub.id}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          • {sub.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
