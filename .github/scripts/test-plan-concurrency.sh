#!/usr/bin/env bash
set -euo pipefail
# No hosted URL, password or token is accepted. Only the local CLI container in CI.
test "${GITHUB_ACTIONS:-false}" = true
task_container=supabase_db_ld-growth-os
test "$(docker ps --filter "name=^/${task_container}$" --format '{{.Names}}')" = "$task_container"
task_psql=(docker exec -i "$task_container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v VERBOSITY=verbose)
"${task_psql[@]}" < .github/scripts/plans-concurrency-fixtures.sql > /dev/null
task_output=$(mktemp -d)
race_write() {
 local isolation=$1 workspace=$2 writer=$3 operation=$4
 "${task_psql[@]}" > "$task_output/$writer.log" 2>&1 <<SQL
begin isolation level $isolation;
set local role authenticated;
set local request.jwt.claim.sub='77777777-4040-4040-8040-404040404007';
set local request.jwt.claims='{"sub":"77777777-4040-4040-8040-404040404007","session_id":"77777777-4040-4040-8040-404040404007","aal":"aal1","role":"authenticated"}';
$operation
select pg_sleep(1);
commit;
SQL
}
assert_race() {
 local isolation=$1 workspace=$2 resource=$3 op_a=$4 op_b=$5
 local pid_a pid_b status_a=0 status_b=0 value
 race_write "$isolation" "$workspace" A "$op_a" & pid_a=$!
 race_write "$isolation" "$workspace" B "$op_b" & pid_b=$!
 wait "$pid_a" || status_a=$?
 wait "$pid_b" || status_b=$?
 if ! { test "$status_a" = 0 && test "$status_b" != 0; } && ! { test "$status_b" = 0 && test "$status_a" != 0; }; then
  cat "$task_output/A.log" "$task_output/B.log"
  echo 'Expected exactly one accepted concurrent operation.' >&2
  exit 1
 fi
 if test "$status_a" != 0; then [[ $(cat "$task_output/A.log") =~ PGL01|40001 ]]; else [[ $(cat "$task_output/B.log") =~ PGL01|40001 ]]; fi
 if test "$resource" = contacts; then
  value=$("${task_psql[@]}" -Atc "select (select count(*) from public.contacts where workspace_id='$workspace')=1 and contacts=1 from control_plane.workspace_usage where workspace_id='$workspace'")
 else
  value=$("${task_psql[@]}" -Atc "select (select count(*) from control_plane.member_slot_reservations where workspace_id='$workspace')=1 and members=1 from control_plane.workspace_usage where workspace_id='$workspace'")
 fi
 test "$value" = t
 echo "PASS: $isolation / $resource — exactly one slot accepted; stock is consistent."
}
for task_case in committed repeatable; do
 if test "$task_case" = committed; then task_isolation='read committed'; task_workspace='40000000-4040-4040-8040-404040404004'; else task_isolation='repeatable read'; task_workspace='50000000-4040-4040-8040-404040404005'; fi
 assert_race "$task_isolation" "$task_workspace" contacts "insert into public.contacts(workspace_id,name) values('$task_workspace','CI A');" "insert into public.contacts(workspace_id,name) values('$task_workspace','CI B');"
 assert_race "$task_isolation" "$task_workspace" members "select public.reserve_member_slot('$task_workspace','a@plans.invalid','viewer');" "select public.reserve_member_slot('$task_workspace','b@plans.invalid','viewer');"
done
rm -rf "$task_output"
