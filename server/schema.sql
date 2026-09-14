CREATE TABLE IF NOT EXISTS users (
  id                VARCHAR(32) PRIMARY KEY,
  name              VARCHAR(80) NOT NULL,
  email             VARCHAR(120) NULL,
  phone             VARCHAR(20) NULL,
  password_hash     VARCHAR(120) NULL,
  level             VARCHAR(32) DEFAULT 'Intermediate',
  profession        VARCHAR(80) NULL,
  nancy_role        VARCHAR(60) NULL,
  role_locked_at    BIGINT NULL,
  plan              VARCHAR(16) DEFAULT 'free',
  plan_started_at   BIGINT NULL,
  plan_expires_at   BIGINT NULL,
  razorpay_customer_id VARCHAR(64) NULL,
  razorpay_sub_id   VARCHAR(64) NULL,
  is_admin          BOOLEAN DEFAULT 0,
  is_banned         BOOLEAN DEFAULT 0,
  last_login_at     BIGINT NULL,
  last_seen_at      BIGINT NULL,
  created_at        BIGINT NOT NULL,
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_plan (plan),
  INDEX idx_last_seen (last_seen_at DESC)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                VARCHAR(32) PRIMARY KEY,
  user_id           VARCHAR(32) NOT NULL,
  scenario          VARCHAR(32) NOT NULL,
  scenario_name     VARCHAR(80) NOT NULL,
  level             VARCHAR(32) NOT NULL,
  started_at        BIGINT NOT NULL,
  ended_at          BIGINT NOT NULL,
  duration          INT NOT NULL,
  turn_count        INT DEFAULT 0,
  word_count        INT DEFAULT 0,
  corrections       INT DEFAULT 0,
  grammar_score     INT NULL,
  vocabulary_score  INT NULL,
  fluency_score     INT NULL,
  confidence_score  INT NULL,
  pronunciation_score INT NULL,
  INDEX idx_user_started (user_id, started_at DESC)
);

CREATE TABLE IF NOT EXISTS mistakes (
  id           VARCHAR(32) PRIMARY KEY,
  user_id      VARCHAR(32) NOT NULL,
  session_id   VARCHAR(32) NULL,
  category     VARCHAR(48) NOT NULL,
  original     VARCHAR(400) NOT NULL,
  corrected    VARCHAR(400) NOT NULL,
  explanation  VARCHAR(500) NULL,
  severity     VARCHAR(16) NOT NULL,
  status       VARCHAR(16) DEFAULT 'active',
  mastered_at  BIGINT NULL,
  created_at   BIGINT NOT NULL,
  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_category (user_id, category)
);

CREATE TABLE IF NOT EXISTS mastery_items (
  id                VARCHAR(32) PRIMARY KEY,
  user_id           VARCHAR(32) NOT NULL,
  item_key          VARCHAR(200) NOT NULL,
  item_type         VARCHAR(24) NOT NULL,
  item_category     VARCHAR(32) DEFAULT 'general',
  original_text     VARCHAR(400) NULL,
  correct_text      VARCHAR(400) NOT NULL,
  stage             VARCHAR(24) DEFAULT 'noted',
  times_said        INT DEFAULT 0,
  times_corrected   INT DEFAULT 0,
  times_used_right  INT DEFAULT 0,
  contexts          JSON NULL,
  first_noted       BIGINT NOT NULL,
  last_seen         BIGINT NOT NULL,
  next_verify_at    BIGINT NULL,
  mastered_at       BIGINT NULL,
  ultra_mastered_at BIGINT NULL,
  UNIQUE KEY uk_user_item (user_id, item_key),
  INDEX idx_user_stage (user_id, stage),
  INDEX idx_verify (next_verify_at)
);

CREATE TABLE IF NOT EXISTS user_facts (
  user_id     VARCHAR(32) NOT NULL,
  fact_type   VARCHAR(48) NOT NULL,
  fact_value  VARCHAR(500) NOT NULL,
  first_seen  BIGINT NOT NULL,
  last_seen   BIGINT NOT NULL,
  mentions    INT DEFAULT 1,
  PRIMARY KEY (user_id, fact_type)
);

CREATE TABLE IF NOT EXISTS user_events (
  id           VARCHAR(32) PRIMARY KEY,
  user_id      VARCHAR(32) NOT NULL,
  event_name   VARCHAR(48) NOT NULL,
  raw_text     VARCHAR(500) NOT NULL,
  resolved_at  BIGINT NULL,
  created_at   BIGINT NOT NULL,
  INDEX idx_user (user_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS tutor_statements (
  id           VARCHAR(32) PRIMARY KEY,
  tutor_role   VARCHAR(60) NOT NULL,
  user_id      VARCHAR(32) NOT NULL,
  topic        VARCHAR(80) NOT NULL,
  text         VARCHAR(800) NOT NULL,
  created_at   BIGINT NOT NULL,
  INDEX idx_user_topic (user_id, topic, created_at DESC)
);

CREATE TABLE IF NOT EXISTS side_topics (
  id           VARCHAR(32) PRIMARY KEY,
  user_id      VARCHAR(32) NOT NULL,
  who          VARCHAR(16) NOT NULL,
  topic        VARCHAR(80) NOT NULL,
  snippet      VARCHAR(400) NULL,
  used         BOOLEAN DEFAULT 0,
  created_at   BIGINT NOT NULL,
  used_at      BIGINT NULL,
  INDEX idx_user_unused (user_id, used, created_at)
);

CREATE TABLE IF NOT EXISTS snapshots (
  user_id          VARCHAR(32) PRIMARY KEY,
  nancy_role       VARCHAR(60) NULL,
  session_count    INT DEFAULT 0,
  streak_days      INT DEFAULT 0,
  total_minutes    INT DEFAULT 0,
  last_topic       VARCHAR(80) NULL,
  payload          JSON NOT NULL,
  updated_at       BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_summaries (
  id             VARCHAR(32) PRIMARY KEY,
  user_id        VARCHAR(32) NOT NULL,
  period_start   BIGINT NOT NULL,
  period_end     BIGINT NOT NULL,
  summary_text   TEXT NOT NULL,
  key_facts      JSON NULL,
  milestones     JSON NULL,
  mastered       JSON NULL,
  session_count  INT DEFAULT 0,
  turns_count    INT DEFAULT 0,
  created_at     BIGINT NOT NULL,
  INDEX idx_user_period (user_id, period_start DESC)
);

CREATE TABLE IF NOT EXISTS plans (
  id                VARCHAR(16) PRIMARY KEY,
  name              VARCHAR(40) NOT NULL,
  price_inr         INT NOT NULL,
  daily_minutes     INT NULL,
  storage_mb        INT DEFAULT 0,
  cloud_sync        BOOLEAN DEFAULT 0,
  full_history      BOOLEAN DEFAULT 0,
  summarization     BOOLEAN DEFAULT 0,
  advanced_voice    BOOLEAN DEFAULT 0,
  priority_support  BOOLEAN DEFAULT 0,
  is_active         BOOLEAN DEFAULT 1,
  display_order     INT DEFAULT 0,
  features          JSON NULL,
  updated_at        BIGINT NOT NULL
);

INSERT INTO plans (id, name, price_inr, daily_minutes, storage_mb, cloud_sync, full_history, summarization, advanced_voice, priority_support, display_order, features, updated_at)
VALUES
  ('free','Free',0,10,0,FALSE,FALSE,FALSE,FALSE,FALSE,1,'["10 minutes per day","All scenarios","Voice corrections","Basic progress"]',UNIX_TIMESTAMP()*1000),
  ('pro','Pro',49,NULL,100,TRUE,TRUE,FALSE,FALSE,FALSE,2,'["Unlimited speaking","Full history","Cloud role backup","Advanced pronunciation"]',UNIX_TIMESTAMP()*1000),
  ('pro_plus','Pro+',499,NULL,5000,TRUE,TRUE,TRUE,TRUE,TRUE,3,'["Everything in Pro","5 GB cloud storage","6-month summaries","Advanced voice (ElevenLabs)","Multi-device sync"]',UNIX_TIMESTAMP()*1000)
ON DUPLICATE KEY UPDATE name=VALUES(name);

CREATE TABLE IF NOT EXISTS payments (
  id                  VARCHAR(32) PRIMARY KEY,
  user_id             VARCHAR(32) NOT NULL,
  plan_id             VARCHAR(16) NOT NULL,
  razorpay_payment_id VARCHAR(64) NULL,
  razorpay_order_id   VARCHAR(64) NULL,
  razorpay_sub_id     VARCHAR(64) NULL,
  amount              INT NOT NULL,
  currency            VARCHAR(8) DEFAULT 'INR',
  status              VARCHAR(20) NOT NULL,
  method              VARCHAR(30) NULL,
  created_at          BIGINT NOT NULL,
  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_razorpay (razorpay_payment_id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id     VARCHAR(64) PRIMARY KEY,
  event_type   VARCHAR(60) NOT NULL,
  payload      JSON NULL,
  processed    BOOLEAN DEFAULT 0,
  received_at  BIGINT NOT NULL,
  INDEX idx_received (received_at DESC)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id           VARCHAR(32) PRIMARY KEY,
  user_id      VARCHAR(32) NOT NULL,
  subject      VARCHAR(200) NOT NULL,
  category     VARCHAR(48) DEFAULT 'general',
  priority     VARCHAR(16) DEFAULT 'normal',
  status       VARCHAR(16) DEFAULT 'open',
  assigned_to  VARCHAR(32) NULL,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL,
  closed_at    BIGINT NULL,
  INDEX idx_user (user_id, created_at DESC),
  INDEX idx_status (status, priority, created_at)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id           VARCHAR(32) PRIMARY KEY,
  ticket_id    VARCHAR(32) NOT NULL,
  sender       VARCHAR(16) NOT NULL,
  sender_id    VARCHAR(32) NOT NULL,
  body         TEXT NOT NULL,
  created_at   BIGINT NOT NULL,
  INDEX idx_ticket (ticket_id, created_at)
);

CREATE TABLE IF NOT EXISTS test_definitions (
  id             VARCHAR(32) PRIMARY KEY,
  title          VARCHAR(120) NOT NULL,
  category       VARCHAR(48) NOT NULL,
  level          VARCHAR(32) NOT NULL,
  duration_sec   INT DEFAULT 300,
  questions      JSON NOT NULL,
  is_active      BOOLEAN DEFAULT 1,
  created_at     BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS test_attempts (
  id             VARCHAR(32) PRIMARY KEY,
  user_id        VARCHAR(32) NOT NULL,
  test_id        VARCHAR(32) NOT NULL,
  score          INT NULL,
  correct        INT DEFAULT 0,
  total          INT DEFAULT 0,
  answers        JSON NULL,
  started_at     BIGINT NOT NULL,
  completed_at   BIGINT NULL,
  INDEX idx_user (user_id, started_at DESC)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id           VARCHAR(32) PRIMARY KEY,
  actor_id     VARCHAR(32) NOT NULL,
  actor_type   VARCHAR(16) NOT NULL,
  action       VARCHAR(64) NOT NULL,
  target_id    VARCHAR(32) NULL,
  target_type  VARCHAR(32) NULL,
  meta         JSON NULL,
  created_at   BIGINT NOT NULL,
  INDEX idx_actor (actor_id, created_at DESC),
  INDEX idx_target (target_id, created_at DESC)
);

CREATE TABLE IF NOT EXISTS settings (
  key_name     VARCHAR(80) PRIMARY KEY,
  value        TEXT NOT NULL,
  description  VARCHAR(200) NULL,
  updated_at   BIGINT NOT NULL
);

INSERT INTO settings (key_name, value, updated_at) VALUES
  ('app_name', 'FluentAI', UNIX_TIMESTAMP()*1000),
  ('free_daily_minutes', '10', UNIX_TIMESTAMP()*1000),
  ('pro_price_inr', '49', UNIX_TIMESTAMP()*1000),
  ('pro_plus_price_inr', '499', UNIX_TIMESTAMP()*1000),
  ('razorpay_enabled', '0', UNIX_TIMESTAMP()*1000),
  ('maintenance_mode', '0', UNIX_TIMESTAMP()*1000),
  ('signups_enabled', '1', UNIX_TIMESTAMP()*1000)
ON DUPLICATE KEY UPDATE value=VALUES(value);

CREATE TABLE IF NOT EXISTS notifications (
  id           VARCHAR(32) PRIMARY KEY,
  user_id      VARCHAR(32) NOT NULL,
  type         VARCHAR(40) NOT NULL,
  title        VARCHAR(120) NOT NULL,
  body         VARCHAR(500) NULL,
  link         VARCHAR(200) NULL,
  is_read      BOOLEAN DEFAULT 0,
  created_at   BIGINT NOT NULL,
  INDEX idx_user_unread (user_id, is_read, created_at DESC)
);