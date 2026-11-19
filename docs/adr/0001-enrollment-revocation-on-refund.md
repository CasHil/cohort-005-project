# Enrollment Revocation on Refund Approval

When a student's Refund Request is approved, we immediately delete their `enrollments` record to revoke course access, while retaining their underlying progress records (`lesson_progress`, `quiz_attempts`, `video_watch_events`) and comments.

## Considered Options

- **Hard-delete `enrollments` row (Chosen)**: Immediately revokes course access across all existing routes without schema migrations or query changes, while keeping financial records (`purchases`, `refunds`) intact.
- **Add revocation status to `enrollments`**: Preserves enrollment lifecycle history on the table, but requires a schema migration and updating every enrollment check across the app to exclude revoked rows.
- **Purge progress and comments**: Reduces storage slightly, but destroys historical analytics, breaks public comment threads, and penalizes students if they repurchase later.
