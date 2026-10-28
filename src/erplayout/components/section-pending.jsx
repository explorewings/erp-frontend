import PageHeader from './page-header.jsx'
import EmptyState from './empty-state.jsx'

export default function SectionPending({ title, lead, Icon, body, note }) {
  return (
    <>
      <PageHeader title={title} lead={lead} />
      <div className="mt-7">
        <EmptyState
          icon={Icon ? <Icon className="h-5 w-5" /> : null}
          title="Nothing here yet"
          description={body}
          note={note}
        />
      </div>
    </>
  )
}
