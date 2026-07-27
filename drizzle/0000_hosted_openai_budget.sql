CREATE TABLE IF NOT EXISTS budget_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  budget_micros INTEGER NOT NULL,
  spent_micros INTEGER NOT NULL DEFAULT 0,
  reserved_micros INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS request_limits (
  client_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client_hash, day)
);

INSERT OR IGNORE INTO budget_state (id, budget_micros)
VALUES (1, 30000000);
