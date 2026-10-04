// Parents before children, so a restore can insert in this order.
export const BACKUP_MODELS = [
  "user", "passwordResetToken", "faculty", "program", "semester", "group", "room", "lessonPeriod",
  "course", "courseTeacher", "courseGroup", "enrollment", "scheduleSlot", "scheduleChange", "scheduleProposal",
  "module", "material", "assignment", "assignmentGroup", "submission", "grade", "attendance",
  "announcement", "notification", "auditLog",
] as const;
