"use client"

import * as React from "react"
import Image from "next/image"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Course } from "@/data/coursesData"

export interface CourseEditorModalProps {
  isOpen: boolean
  editingCourse: Course | null
  onClose: () => void
  onSave: (e: React.FormEvent) => void
  formTitle: string
  setFormTitle: (v: string) => void
  formCode: string
  setFormCode: (v: string) => void
  formDesc: string
  setFormDesc: (v: string) => void
  formLevel: string
  setFormLevel: (v: string) => void
  formSemester: string
  setFormSemester: (v: string) => void
  formStudyPlanDays: string
  setFormStudyPlanDays: (v: string) => void
  formImageUrl: string
  setFormImageUrl: (v: string) => void
  coverFileInputRef: React.RefObject<HTMLInputElement | null>
  isUploadingCover: boolean
  onUploadCoverFile: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function CourseEditorModal({
  isOpen,
  editingCourse,
  onClose,
  onSave,
  formTitle,
  setFormTitle,
  formCode,
  setFormCode,
  formDesc,
  setFormDesc,
  formLevel,
  setFormLevel,
  formSemester,
  setFormSemester,
  formStudyPlanDays,
  setFormStudyPlanDays,
  formImageUrl,
  setFormImageUrl,
  coverFileInputRef,
  isUploadingCover,
  onUploadCoverFile,
}: CourseEditorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in-50">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 end-5 text-muted-foreground hover:text-foreground p-1 rounded-lg"
        >
          <X className="size-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-foreground">
            {editingCourse ? `Edit Course: ${editingCourse.code}` : "Create New Course"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Set title, academic level, study plan duration, and cover image.
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Course Title:</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Software Engineering (CS301)"
                required
                className="text-xs bg-muted/20 h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Course Code:</label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. CS301"
                required
                className="text-xs bg-muted/20 h-10 rounded-xl font-mono"
              />
            </div>
          </div>

          {/* Cover Image URL Input with Live Preview and Supabase Upload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Course Cover Image:</label>
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="size-3.5" />
                <span>{isUploadingCover ? "Uploading to Supabase..." : "Upload Image to Supabase"}</span>
              </button>
            </div>
            <input
              ref={coverFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUploadCoverFile}
            />
            <Input
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or click Upload Image to Supabase"
              className="text-xs bg-muted/20 h-10 rounded-xl font-mono"
            />
            {formImageUrl && (
              <div className="h-32 w-full rounded-2xl overflow-hidden relative border border-border/80 mt-2">
                <Image
                  src={formImageUrl}
                  alt="Course Preview"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="600px"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Academic Level:</label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer"
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Semester:</label>
              <select
                value={formSemester}
                onChange={(e) => setFormSemester(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-muted/20 px-3 text-xs font-bold text-foreground cursor-pointer"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Study Plan (Days):</label>
              <Input
                type="number"
                min="1"
                max="60"
                value={formStudyPlanDays}
                onChange={(e) => setFormStudyPlanDays(e.target.value)}
                className="text-xs bg-muted/20 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Course Description & Goals:</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Overview of core concepts, laboratory modules, and topics covered..."
              rows={3}
              className="w-full rounded-xl border border-input bg-muted/20 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" className="text-xs font-black px-6 rounded-xl shadow-xs">
              Save & Publish Course
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
