export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'editor' | 'admin'
export type ContentStatus = 'draft' | 'reviewed' | 'published'
export type ResourceType = 'video' | 'book' | 'slide' | 'link'
export type QuestionType = 'mcq' | 'written' | 'code_trace'
export type ProgressStatus = 'not_started' | 'in_progress' | 'done'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          email?: string | null
          status?: string | null
          university: string | null
          level: number | null
          role: UserRole
          avatar_url?: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          email?: string | null
          status?: string | null
          university?: string | null
          level?: number | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string | null
          status?: string | null
          university?: string | null
          level?: number | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          slug: string
          code: string | null
          title: string
          description: string | null
          level: number | null
          semester: number | null
          status: ContentStatus
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          code?: string | null
          title: string
          description?: string | null
          level?: number | null
          semester?: number | null
          status?: ContentStatus
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          code?: string | null
          title?: string
          description?: string | null
          level?: number | null
          semester?: number | null
          status?: ContentStatus
          created_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          id: string
          course_id: string
          slug: string
          position: number
          title: string
          summary: string | null
          difficulty: number | null
          status: ContentStatus
        }
        Insert: {
          id?: string
          course_id: string
          slug: string
          position: number
          title: string
          summary?: string | null
          difficulty?: number | null
          status?: ContentStatus
        }
        Update: {
          id?: string
          course_id?: string
          slug?: string
          position?: number
          title?: string
          summary?: string | null
          difficulty?: number | null
          status?: ContentStatus
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      topics: {
        Row: {
          id: string
          chapter_id: string
          slug: string
          position: number
          title: string
          content_md: string | null
          mindmap_md: string | null
          importance: number
          doctor_favorites: string[]
          status: ContentStatus
          fts: unknown | null
        }
        Insert: {
          id?: string
          chapter_id: string
          slug: string
          position: number
          title: string
          content_md?: string | null
          mindmap_md?: string | null
          importance?: number
          doctor_favorites?: string[]
          status?: ContentStatus
          fts?: unknown | null
        }
        Update: {
          id?: string
          chapter_id?: string
          slug?: string
          position?: number
          title?: string
          content_md?: string | null
          mindmap_md?: string | null
          importance?: number
          doctor_favorites?: string[]
          status?: ContentStatus
          fts?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      }
      resources: {
        Row: {
          id: string
          topic_id: string
          type: ResourceType
          title: string
          url: string | null
          start_time: number | null
          page_from: number | null
          page_to: number | null
          source_name: string | null
          position: number
        }
        Insert: {
          id?: string
          topic_id: string
          type: ResourceType
          title: string
          url?: string | null
          start_time?: number | null
          page_from?: number | null
          page_to?: number | null
          source_name?: string | null
          position?: number
        }
        Update: {
          id?: string
          topic_id?: string
          type?: ResourceType
          title?: string
          url?: string | null
          start_time?: number | null
          page_from?: number | null
          page_to?: number | null
          source_name?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
      questions: {
        Row: {
          id: string
          topic_id: string
          type: QuestionType
          body: string
          options: Json | null
          answer: string
          explanation_md: string | null
          difficulty: number
          source_year: number | null
          status: ContentStatus
        }
        Insert: {
          id?: string
          topic_id: string
          type: QuestionType
          body: string
          options?: Json | null
          answer: string
          explanation_md?: string | null
          difficulty?: number
          source_year?: number | null
          status?: ContentStatus
        }
        Update: {
          id?: string
          topic_id?: string
          type?: QuestionType
          body?: string
          options?: Json | null
          answer?: string
          explanation_md?: string | null
          difficulty?: number
          source_year?: number | null
          status?: ContentStatus
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
      flashcards: {
        Row: {
          id: string
          topic_id: string
          front: string
          back: string
        }
        Insert: {
          id?: string
          topic_id: string
          front: string
          back: string
        }
        Update: {
          id?: string
          topic_id?: string
          front?: string
          back?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          }
        ]
      }
      study_plans: {
        Row: {
          id: string
          course_id: string
          title: string
          total_days: number
          plan_json: Json
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          total_days: number
          plan_json: Json
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          total_days?: number
          plan_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      user_progress: {
        Row: {
          user_id: string
          topic_id: string
          status: ProgressStatus
          confidence: number | null
          last_reviewed: string | null
        }
        Insert: {
          user_id: string
          topic_id: string
          status?: ProgressStatus
          confidence?: number | null
          last_reviewed?: string | null
        }
        Update: {
          user_id?: string
          topic_id?: string
          status?: ProgressStatus
          confidence?: number | null
          last_reviewed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_attempts: {
        Row: {
          id: string
          user_id: string
          course_id: string
          question_ids: string[]
          answers: Json
          score: number | null
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          question_ids: string[]
          answers?: Json
          score?: number | null
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          question_ids?: string[]
          answers?: Json
          score?: number | null
          started_at?: string
          finished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_flashcards: {
        Row: {
          user_id: string
          flashcard_id: string
          next_review: string
          interval_days: number
          ease: number
          repetitions: number
        }
        Insert: {
          user_id: string
          flashcard_id: string
          next_review?: string
          interval_days?: number
          ease?: number
          repetitions?: number
        }
        Update: {
          user_id?: string
          flashcard_id?: string
          next_review?: string
          interval_days?: number
          ease?: number
          repetitions?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcards_flashcard_id_fkey"
            columns: ["flashcard_id"]
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcards_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notes: {
        Row: {
          id: string
          user_id: string
          topic_id: string
          body: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          topic_id: string
          body: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic_id?: string
          body?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      content_reports: {
        Row: {
          id: string
          user_id: string | null
          question_id: string | null
          topic_id: string | null
          message: string
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          question_id?: string | null
          topic_id?: string | null
          message: string
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          question_id?: string | null
          topic_id?: string | null
          message?: string
          resolved?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_topic_id_fkey"
            columns: ["topic_id"]
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string
          link: string | null
          target_type?: "all" | "level" | "user" | null
          target_user_id?: string | null
          target_user_name?: string | null
          target_level?: number | null
          notification_type?: "info" | "warning" | "update" | "success" | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          link?: string | null
          target_type?: "all" | "level" | "user" | null
          target_user_id?: string | null
          target_user_name?: string | null
          target_level?: number | null
          notification_type?: "info" | "warning" | "update" | "success" | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          link?: string | null
          target_type?: "all" | "level" | "user" | null
          target_user_id?: string | null
          target_user_name?: string | null
          target_level?: number | null
          notification_type?: "info" | "warning" | "update" | "success" | null
          created_at?: string
        }
        Relationships: []
      }
      student_notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          course_code: string | null
          color: string | null
          is_pinned: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          course_code?: string | null
          color?: string | null
          is_pinned?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          course_code?: string | null
          color?: string | null
          is_pinned?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_reads: {
        Row: {
          user_id: string
          notification_id: string
          read_at: string
        }
        Insert: {
          user_id: string
          notification_id: string
          read_at?: string
        }
        Update: {
          user_id?: string
          notification_id?: string
          read_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_course_tree: {
        Args: {
          p_course_slug: string
        }
        Returns: Json
      }
      review_flashcard: {
        Args: {
          p_flashcard_id: string
          p_quality: number
        }
        Returns: undefined
      }
      start_quiz: {
        Args: {
          p_course_id: string
          p_count?: number
        }
        Returns: string
      }
      finish_quiz: {
        Args: {
          p_attempt_id: string
          p_answers: Json
        }
        Returns: number
      }
      search_topics: {
        Args: {
          p_query: string
        }
        Returns: {
          topic_id: string
          topic_slug: string
          title: string
          chapter_slug: string
          course_slug: string
        }[]
      }
      is_editor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      content_status: ContentStatus
      resource_type: ResourceType
      question_type: QuestionType
      progress_status: ProgressStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
