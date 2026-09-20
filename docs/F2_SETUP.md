# F2 setup and test steps

F2 adds batches, enrollments (a student in a batch with a monthly fee) and guardian links, plus a child switcher on the dashboard for guardians with more than one child.

What F2 gives you:
- Admin tabs: **Students** and **Batches**
- Batches page: create a batch, see student count and monthly total per batch, archived batches tucked away
- Batch page: add students with a fee and start month, edit fee, pause, resume or remove; edit, archive, restore or delete the batch
- Student page: edit details (including active or inactive), add to batches, add guardians by email, remove the student
- Guardian linking: when a guardian signs up (or already has an account) with the email you entered, the account becomes `guardian` and sees only their linked children
- Dashboard: a student sees their own batches and fees; a guardian with 2 or more children gets a switcher at the top (the choice stays in the URL as `?child=...` and is remembered on that device)
- Proper confirm dialogs instead of the browser's `confirm()`

## Part 1. Run the migration (do this BEFORE pushing)

The new screens query tables that do not exist until the migration runs. Run it first, then push, so the live site never shows errors.

1. Supabase Dashboard > **SQL Editor** > **New query**.
2. Paste the whole file `supabase/migrations/20260920000001_f2_batches_enrollments_guardians.sql` and click **Run**. Expect "Success. No rows returned".
3. **Table Editor** should now show `batches`, `enrollments` and `guardian_links`, none with the red "RLS disabled" warning.

## Part 2. Try it on your PC

```powershell
npm install
npm run dev
```

Open http://localhost:5173 and sign in as admin. Work through the tests below locally or on the live site after Part 3.

## Part 3. Deploy

```powershell
git add .
git commit -m "F2: batches, enrollments, guardian links, child switcher"
git push
```

Cloudflare Workers Builds deploys automatically. Wait for the green build, then test on the live URL.

## Part 4. F2 test steps

You need: your admin account, one student account (for example a second Gmail) and one guardian account (a third Gmail). Use a private window for each non-admin account.

1. **Tabs.** As admin, open `/admin`. You see Students and Batches tabs. Click Batches: the URL is `/admin/batches` and the Batches tab is highlighted. Refresh: the page stays.
2. **Create a batch.** Create "Class 9 Math", class 9, subject Math. It appears as a card with "0 students · ৳0 / month". Create another batch with the same name in different case ("class 9 math"): you see "A batch with this name already exists."
3. **Enroll from the batch page.** Open the batch, choose a student, fee 1500, start month this month, click Add. The student appears with "৳1,500 / month · from <this month>". The header shows "1 active student · ৳1,500 / month".
4. **Enroll from the student page.** Create a second batch "Class 9 Physics". Go to Students, open the same student, and add them to Physics from the Batches card. Both batches show there. The student list row now shows both batch names.
5. **Edit and pause.** On the student page, click Edit on Math, change the fee to 1200, Save. Click Pause: a "Paused" badge appears and the batch total drops. Click Resume.
6. **Delete protection.** Open "Class 9 Math". "Delete batch" is disabled while it has students. Click "Archive batch": it moves under "Show archived batches" on the Batches page. Restore it.
7. **Student view.** Sign in as the student (private window). The dashboard shows their name and both batches with fees. No child switcher. Back as admin, archive Physics; the student refreshes and sees only Math. Restore Physics.
8. **Guardian added before sign-up.** On the student page, add guardian email = your guardian test Gmail, name, relation "Mother". The row shows "Not signed up". In a new private window, sign in with Google as that account. It goes straight to `/dashboard` (not the waiting screen) and shows the child. The admin row now says "Signed up" after a refresh.
9. **Guardian added after sign-up.** Add a second student (no email needed). Add the same guardian email to that student too. The success message says the account "already had an account and can now see" the child. The guardian refreshes and now sees a switcher with both names.
10. **Child switcher.** As the guardian, tap the second child: the card and batches change and the URL gets `?child=...`. Refresh: the same child stays selected. Close the tab, open the site again: the last child is still selected.
11. **Guardian is read only.** As the guardian, open `/admin`: you are sent back to `/dashboard`.
12. **Remove a guardian link.** As admin, remove the guardian from one child (confirm dialog). The guardian refreshes and sees only one child, no switcher. Remove the last link: the guardian refreshes and lands on the waiting screen.
13. **Remove a student.** Add the guardian back to a student, then use "Remove student" at the bottom of the student page. After confirming you return to the list. The student's account and the guardian's account both go back to the waiting screen.
14. **Duplicate guardian.** Add the same guardian email twice to one student: you see "This guardian email is already linked to this student."

Optional SQL check (SQL Editor), expect no rows:

```sql
select tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
```

## Notes

- Fees are stored per enrollment in whole taka, so one student can pay different amounts for different batches.
- Pause keeps the enrollment (and later its dues history); Remove deletes it.
- Archiving a batch hides it from students and guardians but keeps everything for you.
- If an account is both a student and a guardian, it stays `student` and the dashboard shows the switcher with itself and its children.
