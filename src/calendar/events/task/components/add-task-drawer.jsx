import AddEventDrawer from '../../../components/add-event-drawer.jsx'

/**
 * Create a task in the right-side drawer (plan Phase 4 "AddTask").
 * Thin wrapper over the shared create drawer; assignee options are narrowed by
 * role in the page and re-checked by the server.
 */
export default function AddTaskDrawer(props) {
  return <AddEventDrawer type="task" {...props} />
}
