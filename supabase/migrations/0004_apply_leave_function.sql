-- supabase/migrations/0004_apply_leave_function.sql
-- 연차 신청 원자적 처리 함수.
-- INSERT leave_requests + (annual인 경우) leave_balances total_used/remaining 갱신을
-- 단일 트랜잭션 + row-level lock으로 묶는다. 동시 신청에서 잔여가 음수가 되는 race를 방지.
--
-- 호출: supabase.rpc('apply_leave', { p_employee_id, p_leave_type, p_start_date, p_end_date, p_days, p_reason })
-- 반환: 새로 생성된 leave_requests.id (uuid)
--
-- 에러 코드:
--   P0001 = 연차 발생 데이터(leave_balances) 없음
--   P0002 = 잔여 부족
-- caller는 PostgrestError.code 또는 message로 분기.

create or replace function chongmu.apply_leave(
  p_employee_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_days numeric,
  p_reason text
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_year int := extract(year from p_start_date)::int;
  v_request_id uuid;
  v_remaining numeric;
begin
  -- annual 유형만 leave_balances 검증·갱신.
  if p_leave_type = 'annual' then
    select remaining into v_remaining
      from chongmu.leave_balances
      where employee_id = p_employee_id and year = v_year
      for update;

    if v_remaining is null then
      raise exception '%년 연차 발생 데이터가 없습니다. 일괄 부여를 먼저 실행하세요.', v_year
        using errcode = 'P0001';
    end if;

    if v_remaining < p_days then
      raise exception '잔여 %일이 신청 %일보다 부족합니다.', v_remaining, p_days
        using errcode = 'P0002';
    end if;

    update chongmu.leave_balances
      set total_used = total_used + p_days,
          remaining = remaining - p_days
      where employee_id = p_employee_id and year = v_year;
  end if;

  insert into chongmu.leave_requests (
    employee_id, leave_type, start_date, end_date, days, reason, status
  ) values (
    p_employee_id, p_leave_type, p_start_date, p_end_date, p_days, p_reason, 'approved'
  ) returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function chongmu.apply_leave(uuid, text, date, date, numeric, text)
  to authenticated, service_role;
