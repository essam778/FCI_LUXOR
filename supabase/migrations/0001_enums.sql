create extension if not exists pgcrypto;

create type user_role       as enum ('student','editor','admin');
create type content_status  as enum ('draft','reviewed','published');
create type resource_type   as enum ('video','book','slide','link');
create type question_type   as enum ('mcq','written','code_trace');
create type progress_status as enum ('not_started','in_progress','done');
