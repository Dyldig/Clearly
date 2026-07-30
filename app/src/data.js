// Sample data for the four connected channels the design brief called for
// (Seesaw, QKR, a sports club, a medical portal, a body corporate app and a
// community group) plus a week's worth of realistic items across them.

export const WEEKMETA = [
  { label: 'Today', sub: 'Thu 30 Jul' },
  { label: 'Tomorrow', sub: 'Fri 31 Jul' },
  { label: 'Saturday', sub: '1 Aug' },
  { label: 'Sunday', sub: '2 Aug' },
  { label: 'Monday', sub: '3 Aug' },
  { label: 'Tuesday', sub: '4 Aug' },
  { label: 'Wednesday', sub: '5 Aug' },
];

// Maps each WEEKMETA order index to a real [year, month(0-based), day].
export const ORDER_TO_DATE = [
  [2026, 6, 30], [2026, 6, 31], [2026, 7, 1], [2026, 7, 2], [2026, 7, 3], [2026, 7, 4], [2026, 7, 5],
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const ITEMS = [
  { id: 'i5', order: 0, channel: 'Seesaw', hue: 230, title: 'Great reading challenge effort!',
    summary: "Ollie finished his fourth book this term — his teacher wanted to share the news with a small classroom shout-out.",
    original: "Hi families, just a quick note to say Ollie has smashed through 4 books this term as part of our reading challenge! We celebrated with a sticker on the classroom chart today. No action needed — just wanted to share the good news. Keep up the great reading at home!",
    dateLabel: null, actionRequired: false, read: true },
  { id: 'i1', order: 1, channel: 'Seesaw', hue: 230, title: 'Book Week costume needed',
    summary: "Ollie's class is holding a Book Week parade this Friday — he needs a costume based on a favourite book character.",
    original: "Reminder: our Book Week parade is this Friday at 9:15am in the school hall. Children are invited to dress as their favourite book character (home-made costumes encouraged, no need to buy anything new). Please have Ollie in costume when he arrives at school that morning. Parents welcome to watch from the hall balcony.",
    dateLabel: 'Due Fri', actionRequired: true, read: false },
  { id: 'i3', order: 2, channel: 'Ryde United FC', hue: 50, title: 'Saturday game moved to 9am',
    summary: "Mia's game against Gladesville has been brought forward — kickoff is now 9:00am, arrive by 8:30 for warm-up.",
    original: "Team, due to a ground clash the U11 Girls fixture against Gladesville has been rescheduled from 11am to 9:00am this Saturday at Elouera Reserve, Field 2. Please arrive by 8:30am for warm-up. Bring both kits in case of a colour clash. See you there!",
    dateLabel: '9:00am Sat', actionRequired: true, read: true },
  { id: 'i6', order: 3, channel: 'Fig Tree Families', hue: 180, title: 'Uniform swap this Sunday',
    summary: "The parent group is running a second-hand uniform swap Sunday morning at the hall — drop-offs welcome from 9am.",
    original: "Hi all! Running our term 3 uniform swap this Sunday 10am-12pm at the community hall. Drop off any outgrown uniforms from 9am. Gold coin donation on entry goes to the P&C. Bring a bag to carry home your finds — great chance to grab winter jumpers before it gets colder!",
    dateLabel: null, actionRequired: false, read: false },
  { id: 'i2', order: 4, channel: 'QKR', hue: 145, title: 'Taronga Zoo excursion payment',
    summary: "Payment of $28.50 is due for Year 2's excursion to Taronga Zoo — the permission note and payment are both required.",
    original: "Payment request: Year 2 Excursion — Taronga Zoo. Amount due: $28.50 per student, covers bus transport and entry. Please complete payment and the accompanying permission note by end of day Monday. Students who have not paid by the deadline will be unable to attend and will remain at school with Year 1.",
    dateLabel: 'Due Mon', actionRequired: true, read: false },
  { id: 'i4', order: 5, channel: 'Sydney Kids Medical', hue: 10, title: "Mia's dental check-up reminder",
    summary: "Mia's six-month dental check-up is coming up — please confirm or reschedule if the time no longer suits.",
    original: "This is a reminder that Mia Chen has an upcoming dental check-up scheduled for Tuesday at 4:15pm with Dr. Patel. Please arrive 10 minutes early to complete a brief health update form. If this time no longer suits, call the clinic on (02) 9xxx xxxx or reply to reschedule.",
    dateLabel: '4:15pm Tue', actionRequired: true, read: false },
  { id: 'i7', order: 6, channel: 'Horizon Strata', hue: 290, title: 'Pool closed for maintenance',
    summary: "The building's pool will be closed Wednesday and Thursday for annual filtration maintenance — no action needed.",
    original: "Notice to all residents: the swimming pool and surrounding deck will be closed from Wednesday to Thursday this week for scheduled filtration system maintenance. Access will resume Friday morning. We apologise for any inconvenience. Contact building management with any questions.",
    dateLabel: null, actionRequired: false, read: true },
];

export const CHANNELS = [
  { id: 'seesaw', name: 'Seesaw', category: 'Fig Tree Primary · School', hue: 230, status: 'connected', synced: 'Synced 2m ago', muted: false, priority: true },
  { id: 'qkr', name: 'QKR', category: 'Fig Tree Primary · Payments', hue: 145, status: 'connected', synced: 'Synced 1h ago', muted: false, priority: false },
  { id: 'ryde', name: 'Ryde United FC', category: 'Mia · Soccer club', hue: 50, status: 'connected', synced: 'Synced 15m ago', muted: false, priority: true },
  { id: 'medical', name: 'Sydney Kids Medical', category: 'Medical portal', hue: 10, status: 'connected', synced: 'Synced yesterday', muted: false, priority: false },
  { id: 'strata', name: 'Horizon Strata', category: 'Body corporate', hue: 290, status: 'connected', synced: 'Synced 3d ago', muted: true, priority: false },
  { id: 'community', name: 'Fig Tree Families', category: 'Community group', hue: 180, status: 'syncing', synced: 'Syncing…', muted: true, priority: false },
];
