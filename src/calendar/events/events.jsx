import TaskForm, {
  initialTaskForm,
  taskCardRows,
  taskDetails,
  taskFormFromEvent,
  taskPayload,
  taskSummary,
  validateTask,
} from './task/components/task-form.jsx'
import AnnouncementForm, {
  announcementCardRows,
  announcementDetails,
  announcementFormFromEvent,
  announcementPayload,
  announcementSummary,
  initialAnnouncementForm,
  validateAnnouncement,
} from './announcement/components/announcement-form.jsx'
import MeetingForm, {
  initialMeetingForm,
  meetingCardRows,
  meetingDetails,
  meetingFormFromEvent,
  meetingPayload,
  meetingSummary,
  validateMeeting,
} from './meeting/components/meeting-form.jsx'

/*
 * Event type registry. The calendar shell (grid, panels, modal, drawer) is
 * type-agnostic and looks everything type-specific up here. Followup is added
 * in the plan's Phase 7, once the CRM pipeline/deal data exists.
 */
export const EVENT_DEFINITIONS = {
  task: {
    Form: TaskForm,
    initialForm: initialTaskForm,
    formFromEvent: taskFormFromEvent,
    validate: validateTask,
    toPayload: taskPayload,
    summary: taskSummary,
    cardRows: taskCardRows,
    details: taskDetails,
    createTitle: 'New task',
    createLabel: 'Create task',
  },
  announcement: {
    Form: AnnouncementForm,
    initialForm: initialAnnouncementForm,
    formFromEvent: announcementFormFromEvent,
    validate: validateAnnouncement,
    toPayload: announcementPayload,
    summary: announcementSummary,
    cardRows: announcementCardRows,
    details: announcementDetails,
    createTitle: 'New announcement',
    createLabel: 'Post announcement',
  },
  meeting: {
    Form: MeetingForm,
    initialForm: initialMeetingForm,
    formFromEvent: meetingFormFromEvent,
    validate: validateMeeting,
    toPayload: meetingPayload,
    summary: meetingSummary,
    cardRows: meetingCardRows,
    details: meetingDetails,
    createTitle: 'New meeting',
    createLabel: 'Schedule meeting',
  },
}

export const definitionFor = (type) => EVENT_DEFINITIONS[type] ?? null
