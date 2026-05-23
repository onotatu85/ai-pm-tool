export type ProjectStatus = 'planning' | 'active' | 'completed' | 'archived'
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published'
export type OrgRole = 'admin' | 'member' | 'viewer'
export type AiPromptType = 'improve' | 'summarize' | 'seo' | 'tone'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface Organization {
  id: string
  name: string
  plan: 'free' | 'pro'
  created_at: string
}

export interface OrgMember {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  created_at: string
  profile?: Profile
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  project_id: string
  title: string
  body: string | null
  status: ContentStatus
  assignee_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface ProjectFile {
  id: string
  project_id: string
  name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  extracted_text: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
  uploader?: { display_name: string }
}

export interface AiSession {
  id: string
  content_id: string
  prompt_type: AiPromptType
  prompt_text: string
  response: string | null
  model: string
  status: 'pending' | 'completed' | 'failed'
  created_by: string
  created_at: string
}
