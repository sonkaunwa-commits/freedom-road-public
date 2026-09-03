# Execution Traceability Gate v1

This module turns autonomous work claims into a small machine-checkable contract.

It validates the fields that are mirrored in governed GitHub issues: `Active-Work-ID`, `Task-ID`, the current status chain, declared write intent, blocker/lease state, and closeout evidence. The gate is deliberately repository-only and zero-dependency.

## Fail-closed rules

- Active-Work-ID and Task-ID are unique and follow a stable uppercase identifier grammar.
- Status tokens come from an explicit allowlist; terminal status stands alone.
- Mutating work declares repository-relative POSIX write paths. Absolute paths, URLs and path escape are rejected.
- Two active writers may not overlap the same file or parent/child write scope.
- Work in `WAITING_FOR_WRITE_LEASE` or `BLOCKED` is not treated as an active writer, but it must identify its blocker.
- `COMPLETED` requires verification evidence and a closeout reference.
- Public trace records must not claim private-data handling.

The sample ledger is a deterministic fixture. It intentionally includes one active Pages writer and one queued work item that declares the same workflow path while waiting for the write lease; that is valid. Promoting the queued item to an active writer makes the self-test fail.

The module does not query GitHub, mutate issues, create schedules, publish artifacts, send notifications, invoke models, or perform production/trading actions.
