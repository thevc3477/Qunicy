/**
 * Generate and download a .ics calendar file for an event
 *
 * @param {Object} event
 * @param {string} event.title - Event name
 * @param {string} event.starts_at - ISO date string
 * @param {string} event.venue_name - Venue name
 * @param {string} event.city - City
 * @param {number} [durationHours=3] - Event duration in hours
 */
export function downloadCalendarInvite(event, durationHours = 3) {
  const start = new Date(event.starts_at)
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

  const formatDate = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const location = [event.venue_name, event.city].filter(Boolean).join(', ')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Quincy//Vinyl Collectiv//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeIcs(event.title || 'Vinyl Collectiv Event')}`,
    `LOCATION:${escapeIcs(location)}`,
    `DESCRIPTION:${escapeIcs("Bring a Record, Catch a Vibe 🎶\n\nYou're RSVP'd via Quincy. See you there!")}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${(event.title || 'vinyl-collectiv-event').replace(/\s+/g, '-').toLowerCase()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeIcs(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
