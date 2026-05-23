import type { ContentStatus, ProjectStatus } from '@/lib/types'

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning',  label: '未着手' },
  { value: 'active',    label: '進行中' },
  { value: 'completed', label: '完了'   },
  { value: 'archived',  label: '保留'   },
]

const projectStatusMap: Record<ProjectStatus, { label: string; className: string }> = {
  planning:  { label: '未着手', className: 'bg-slate-100 text-slate-500'    },
  active:    { label: '進行中', className: 'bg-green-100 text-green-700'    },
  completed: { label: '完了',   className: 'bg-blue-100 text-blue-700'      },
  archived:  { label: '保留',   className: 'bg-orange-100 text-orange-600'  },
}

const contentStatusMap: Record<ContentStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-slate-100 text-slate-600'  },
  review:    { label: 'Review',    className: 'bg-yellow-100 text-yellow-700' },
  approved:  { label: 'Approved',  className: 'bg-blue-100 text-blue-700'    },
  published: { label: 'Published', className: 'bg-green-100 text-green-700'  },
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = projectStatusMap[status] ?? projectStatusMap['active']
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
