CREATE DATABASE IF NOT EXISTS own CHARACTER SET utf8mb4;
USE own;

CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  privacy_accepted_at DATETIME NOT NULL,
);

CREATE TABLE categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE catalog_tones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  position    TINYINT NOT NULL,
  name        VARCHAR(40) NOT NULL,
  hex         CHAR(7) NOT NULL,
  UNIQUE (category_id, position),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE test_results (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  answers        JSON NOT NULL,              
  score_calida   TINYINT NOT NULL DEFAULT 0,
  score_fria     TINYINT NOT NULL DEFAULT 0,
  score_neutra   TINYINT NOT NULL DEFAULT 0,
  score_luminosa TINYINT NOT NULL DEFAULT 0,
  score_intensa  TINYINT NOT NULL DEFAULT 0,
  score_profunda TINYINT NOT NULL DEFAULT 0,
  category_id    INT NULL,                   
  pending_reason VARCHAR(40) NULL,           
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE user_tones (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id  INT NOT NULL,
  position TINYINT NOT NULL,
  name     VARCHAR(40) NOT NULL,
  hex      CHAR(7) NOT NULL,
  UNIQUE (user_id, position),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  type         ENUM('kit','refill') NOT NULL,
  user_tone_id INT NULL,
  tone_name    VARCHAR(40) NULL,      
  tone_hex     CHAR(7) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_tone_id) REFERENCES user_tones(id) ON DELETE SET NULL
);