import type { ContentStatus, ProjectStatus } from '@/lib/types'

const projectStatusMap = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', className: 'bg-slate-100 text-slate-500' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
} satisfies Record<ProjectStatus, { label: string; className: string }>

const contentStatusMap = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  review: { label: 'Review', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
} satisfies Record<ContentStatus, { label: string; className: string }>

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = projectStatusMap[status]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  )
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const { label, className } = contentStatusMap[status]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  )
}
