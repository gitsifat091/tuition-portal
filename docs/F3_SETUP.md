# F3 setup and test steps

F3 adds the schedule: a weekly routine per batch, dated classes generated from it, and cancel, move (reschedule) and extra classes. Students and guardians get a Schedule page and, with it, the app navigation.

What F3 gives you:
- Batch page: a **Weekly routine** card (add or remove day and time slots) and "Generate the next 4 weeks for this batch"
- Admin **Schedule** tab (`/admin/schedule`): generate classes for 1 to 8 weeks, filter by batch, move week by week, and on each class: Move, Cancel, Restore, Delete; plus "Add extra class"
- Students and guardians: `/schedule` with an **Upcoming** list (next 2 weeks) and a **Week** view, a colour key, and the weekly routine; the child switcher works here too
- Dashboard: a "Next classes" card with the next two classes
- Navigation for students and guardians: bottom bar on phones, sidebar on wide screens. The selected child (`?child=`) is kept when switching pages
- Colours: teal = scheduled, amber = rescheduled, indigo = extra class, red = cancelled

Rules worth knowing:
- All times are Bangladesh time (Asia/Dhaka), whatever the device's time zone.
- Weeks start on Saturday.
- Generating is safe to repeat. A date that already has its class is skipped, even if you cancelled or moved that class. Times already past are skipped. Archived batches are skipped.
- Moving a routine class marks it **Rescheduled** and shows "Moved from ...". Moving it back to its first time makes it a normal class again.
- Removing a routine slot also removes that slot's future classes you never touched. Past classes and ones you cancelled or moved stay.
- Delete removes a class completely (students see nothing). Use Cancel when students should know a class is off. A deleted routine class comes back the next time you generate.
- Paused enrollments and archived batches hide the schedule from students and guardians, same as F2.

## Part 1. Unzip and check

From PowerShell in `D:\Web\tuition-portal-f1\tuition-portal`:

```powershell
Expand-Archive -Path "$HOME\Downloads\tuition-portal-f3.zip" -DestinationPath . -Force
git status
```

`git status` should list these new files:
- `supabase/migrations/20260920000002_f3_schedule.sql`
- `docs/F3_SETUP.md`
- `src/lib/time.ts`, `src/lib/useNow.ts`
- `src/features/schedule/` (api.ts, status.ts, SessionItem.tsx, SessionDialogs.tsx, SchedulePage.tsx, AdminSchedulePage.tsx, WeeklyRoutineCard.tsx)
- `src/features/dashboard/ChildSwitcher.tsx`

and these changed files: `src/app/router.tsx`, `src/components/layout/AppShell.tsx`, `src/components/ui/index.tsx`, `src/lib/types.ts`, `src/styles/index.css`, `src/features/admin/AdminLayout.tsx`, `src/features/admin/BatchDetailPage.tsx`, `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/useMyStudents.ts`.

## Part 2. Run the migration (BEFORE pushing)

1. Supabase Dashboard > **SQL Editor** > **New query**.
2. Paste the whole file `supabase/migrations/20260920000002_f3_schedule.sql` and click **Run**. Expect "Success. No rows returned".
3. **Table Editor** shows `weekly_slots` and `class_sessions`, neither with the red "RLS disabled" warning.

## Part 3. Try it on your PC (optional)

```powershell
npm install
npm run dev
```

Open http://localhost:5173 and sign in as admin.

## Part 4. Deploy

```powershell
git add .
git commit -m "F3: schedule, weekly routine, cancel, reschedule, extra class"
git push
```

Wait for the green Workers build, then test on the live site.

## Part 5. F3 test steps

You need: your admin account, the student test account and the guardian test account from F2 (guardian linked to at least one child who is in a batch). Use a private window for each non-admin account.

1. **Routine.** As admin open a batch (for example "Class 9 Math"). In **Weekly routine** add Saturday 4:00 pm to 5:30 pm and Monday 4:00 pm to 5:30 pm. Both appear, Saturday first.
2. **Routine errors.** Add Saturday 4:00 pm again: "This batch already has a class at that day and time." Add a slot with end 3:00 pm and start 4:00 pm: "The end time must be after the start time."
3. **Generate for one batch.** Click "Generate the next 4 weeks for this batch": "Added 8 classes" (7 or 8 depending on today). Click it again: "Nothing new to add."
4. **Admin schedule.** Click the **Schedule** tab. This week shows Saturday to Friday, with today marked. The classes appear with Move, Cancel and Delete. Use the arrows to see next week, then "This week". Refresh: the week stays (it is in the URL).
5. **Filter.** Choose the batch in the Batch filter: only its classes show and the batch name is hidden on each card. Choose "All batches" again.
6. **Cancel.** On a class next week click Cancel, type "Eid holiday", click "Cancel class". It turns red, struck through, with the note. Click Restore: it is a normal teal class again. Cancel it again for the next steps.
7. **Move.** On another class click Move, change the start to 6:00 pm and end to 7:30 pm, add a note, Save. It turns amber with "Moved from <day>, 4:00 pm". Open Move again and set it back to 4:00 pm to 5:30 pm: it becomes a normal class. Move it to 6:00 pm again.
8. **Extra class.** Click "Add extra class", choose the batch, a date this week, 11:00 am to 12:30 pm, note "Exam preparation". It appears in indigo as "Extra class".
9. **Generate again after changes.** Press Generate (next 4 weeks) on the Schedule tab: nothing is duplicated; the cancelled and moved classes are still single.
10. **Student view.** As the student (private window): the bottom bar shows Home and Schedule (on a wide window, a sidebar). Home shows "Next classes". Schedule, Upcoming shows the next 2 weeks grouped by day with the cancelled (red, with note), moved (amber, "Moved from ...") and extra (indigo) classes. Week shows the same week as the admin. The Weekly routine card lists Sat and Mon 4:00 pm.
11. **Guardian view.** As the guardian: the Schedule page shows the child switcher (if 2 or more children). Switch child: the classes change to that child's batches. Go to Home and back: the same child stays selected.
12. **Read only.** As the student, open `/admin/schedule`: you are sent to `/dashboard`.
13. **Hide on pause and archive.** As admin, pause the student's enrollment in the batch: the student's schedule shows "not in a batch yet". Resume it. Archive the batch: same. Restore it.
14. **Remove a slot.** On the batch page, remove the Monday slot (confirm). On the Schedule tab, future Monday classes are gone, but a Monday class you cancelled or moved (if any) is still there. Past classes stay.
15. **Delete.** Delete the extra class (confirm): it disappears for admin and student.

Optional SQL checks (SQL Editor). Expect no rows from the first; the second shows Bangladesh times:

```sql
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

select b.name, c.status, c.starts_at at time zone 'Asia/Dhaka' as local_start
from class_sessions c join batches b on b.id = c.batch_id
order by c.starts_at limit 10;
```

## Notes

- Generation is manual for now (press Generate every few weeks). An automatic weekly job can come later with pg_cron.
- F4 will add notifications on schedule changes; the `updated_at` column on `class_sessions` is already there for it.
- F7 (attendance) will mark attendance per class from the admin schedule.
