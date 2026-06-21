ALTER TABLE agent_cards
ADD COLUMN classification_json TEXT NOT NULL DEFAULT '{}';
