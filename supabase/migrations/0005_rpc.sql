-- Course tree with the caller's progress (one round trip)
create or replace function get_course_tree(p_course_slug text)
returns jsonb language sql stable security invoker as $$
  select jsonb_build_object(
    'course', to_jsonb(c),
    'chapters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ch.id, 'slug', ch.slug, 'title', ch.title, 'difficulty', ch.difficulty,
          'topics', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', t.id, 'slug', t.slug, 'title', t.title, 'importance', t.importance,
              'status', coalesce(up.status, 'not_started')
            ) order by t.position)
            from topics t
            left join user_progress up on up.topic_id = t.id and up.user_id = auth.uid()
            where t.chapter_id = ch.id
          ), '[]'::jsonb)
        ) order by ch.position)
      from chapters ch where ch.course_id = c.id
    ), '[]'::jsonb)
  )
  from courses c where c.slug = p_course_slug;
$$;

-- SM-2 (simplified) spaced repetition review. p_quality: 0..5
create or replace function review_flashcard(p_flashcard_id uuid, p_quality int)
returns void language plpgsql security invoker as $$
declare r user_flashcards%rowtype; new_ease numeric; new_interval int; new_reps int;
begin
  insert into user_flashcards (user_id, flashcard_id)
  values (auth.uid(), p_flashcard_id) on conflict do nothing;

  select * into r from user_flashcards
  where user_id = auth.uid() and flashcard_id = p_flashcard_id;

  if p_quality < 3 then
    new_reps := 0; new_interval := 1; new_ease := greatest(1.3, r.ease - 0.2);
  else
    new_reps := r.repetitions + 1;
    new_ease := greatest(1.3, r.ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02)));
    new_interval := case new_reps when 1 then 1 when 2 then 6
                    else round(r.interval_days * new_ease)::int end;
  end if;

  update user_flashcards
  set repetitions = new_reps, ease = new_ease, interval_days = new_interval,
      next_review = current_date + new_interval
  where user_id = auth.uid() and flashcard_id = p_flashcard_id;
end $$;

-- Quiz: build attempt, grade MCQs server-side, compute score
create or replace function start_quiz(p_course_id uuid, p_count int default 10)
returns uuid language plpgsql security invoker as $$
declare v_id uuid; v_ids uuid[];
begin
  select array_agg(q.id) into v_ids from (
    select q.id from questions q
    join topics t on t.id = q.topic_id
    join chapters ch on ch.id = t.chapter_id
    where ch.course_id = p_course_id and q.status = 'published'
    order by random() limit p_count
  ) q;
  insert into quiz_attempts (user_id, course_id, question_ids)
  values (auth.uid(), p_course_id, v_ids) returning id into v_id;
  return v_id;
end $$;

create or replace function finish_quiz(p_attempt_id uuid, p_answers jsonb)
returns numeric language plpgsql security invoker as $$
declare v_score numeric; v_total int;
begin
  select count(*) into v_total from quiz_attempts a, unnest(a.question_ids) qid
  where a.id = p_attempt_id and a.user_id = auth.uid();

  select count(*) filter (where p_answers->>(q.id::text) = q.answer)::numeric / nullif(v_total,0) * 100
  into v_score
  from quiz_attempts a
  join questions q on q.id = any(a.question_ids)
  where a.id = p_attempt_id and a.user_id = auth.uid() and q.type = 'mcq';

  update quiz_attempts set answers = p_answers, score = v_score, finished_at = now()
  where id = p_attempt_id and user_id = auth.uid();
  return v_score;
end $$;

-- Search
create or replace function search_topics(p_query text)
returns table (topic_id uuid, topic_slug text, title text, chapter_slug text, course_slug text)
language sql stable security invoker as $$
  select t.id, t.slug, t.title, ch.slug, c.slug
  from topics t join chapters ch on ch.id = t.chapter_id join courses c on c.id = ch.course_id
  where t.fts @@ plainto_tsquery('simple', p_query) and t.status = 'published'
  limit 20;
$$;
