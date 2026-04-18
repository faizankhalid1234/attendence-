/** Attendance dashboard UI strings (English). */

export const L = {
  statusComplete: "Complete",
  statusCompleteDetail: "Checked in & out",
  statusPending: "Pending",
  statusPendingDetail: "Check-in only (no check-out yet)",
  statusAbsent: "Absent",
  statusAbsentDetail: "No check-in recorded",

  checkIn: "Check-in",
  checkOut: "Check-out",
  checkOutNotYet: "Check-out not marked yet",

  thDay: "Day",
  thCheckInTime: "Check-in time",
  thCheckOutTime: "Check-out time",
  thStatus: "Status",
  thPhotos: "Photos",
  recordsTitle: "Attendance history",
  noRecords: "No records yet.",

  linkCheckInPhoto: "Check-in photo",
  linkCheckOutPhoto: "Check-out photo",

  pieComplete: "Complete",
  piePending: "Pending",
  pieAbsent: "Absent",

  todayPrefix: "Today",
  companyCalPhrase: "Company calendar date",
  noRecordToday: "No attendance marked for today yet.",

  field1Tag: "Section 1 — Summary",
  field1Title: "Last 14 days: complete, pending, absent",
  field1Help:
    "Complete = check-in and check-out. Pending = check-in only. Absent = no mark that day (includes leave if not marked).",

  field2Tag: "Section 2 — Daily breakdown",
  field2Title: "One column per day",
  field2Help: "Green = complete, amber = pending, grey = absent. Your record only.",

  coTeamHeader: "Team reports",
  coTeamTitle: "Your company only",
  coTeamHelp: "Each block below is a separate section.",

  coF1: "Section 1 — Team summary",
  coF1Title: "All members combined",
  coF1Desc: "Sum of all member-days in this chart only.",

  coF2: "Section 2 — Member selection",
  coF2Title: "Which member's data to view",
  coF2Desc: "Pick a member — details follow in the next sections.",
  coMemberLabel: "Member",

  coF3: "Section 3 — Member counts",
  coF3Title: "Count summary",

  coF4: "Section 4 — Daily columns",
  coF4Title: "One bar per day",
  coF4Desc: "Breakdown for the member chosen in Section 2 only.",

  coDuration: "Duration (days)",
  coRefresh: "Refresh",
  coNoMembers: "No members yet — add a member first.",
} as const;

export const chartTooltip: Record<"complete" | "pending" | "absent", string> = {
  complete: "Complete (checked in & out)",
  pending: "Pending (check-in only)",
  absent: "Absent (no mark)",
};
