-- PostgreSQL schema for Guacamole
-- Based on official Apache Guacamole PostgreSQL schema

CREATE TABLE guacamole_connection_group (
    connection_group_id   SERIAL PRIMARY KEY,
    parent_id             INTEGER,
    connection_group_name VARCHAR(128) NOT NULL,
    type                  VARCHAR(16) NOT NULL DEFAULT 'ORGANIZATIONAL',
    max_connections       INTEGER,
    max_connections_per_user INTEGER,
    enable_session_affinity BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(connection_group_name, parent_id)
);

CREATE TABLE guacamole_connection (
    connection_id           SERIAL PRIMARY KEY,
    connection_name         VARCHAR(128) NOT NULL,
    parent_id               INTEGER,
    protocol                VARCHAR(32) NOT NULL,
    proxy_port              INTEGER,
    proxy_hostname          VARCHAR(512),
    proxy_encryption_method VARCHAR(4),
    max_connections         INTEGER,
    max_connections_per_user INTEGER,
    connection_weight       INTEGER,
    failover_only           BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(connection_name, parent_id)
);

CREATE TABLE guacamole_entity (
    entity_id SERIAL PRIMARY KEY,
    name      VARCHAR(128) NOT NULL,
    type      VARCHAR(9) NOT NULL,  -- 'USER' or 'USER_GROUP'
    UNIQUE(type, name)
);

CREATE TABLE guacamole_user (
    user_id              SERIAL PRIMARY KEY,
    entity_id            INTEGER NOT NULL UNIQUE,
    password_hash        BYTEA NOT NULL,
    password_salt        BYTEA,
    password_date        TIMESTAMP NOT NULL,
    disabled             BOOLEAN NOT NULL DEFAULT FALSE,
    expired              BOOLEAN NOT NULL DEFAULT FALSE,
    access_window_start  TIME,
    access_window_end    TIME,
    valid_from           DATE,
    valid_until          DATE,
    timezone             VARCHAR(64),
    full_name            VARCHAR(256),
    email_address        VARCHAR(256),
    organization         VARCHAR(256),
    organizational_role  VARCHAR(256),
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_group (
    user_group_id SERIAL PRIMARY KEY,
    entity_id     INTEGER NOT NULL UNIQUE,
    disabled      BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_group_member (
    user_group_id    INTEGER NOT NULL,
    member_entity_id INTEGER NOT NULL,
    PRIMARY KEY (user_group_id, member_entity_id),
    FOREIGN KEY (user_group_id) REFERENCES guacamole_user_group(user_group_id) ON DELETE CASCADE,
    FOREIGN KEY (member_entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_sharing_profile (
    sharing_profile_id    SERIAL PRIMARY KEY,
    sharing_profile_name  VARCHAR(128) NOT NULL,
    primary_connection_id INTEGER NOT NULL,
    UNIQUE(sharing_profile_name, primary_connection_id),
    FOREIGN KEY (primary_connection_id) REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_parameter (
    connection_id   INTEGER NOT NULL,
    parameter_name  VARCHAR(128) NOT NULL,
    parameter_value VARCHAR(4096) NOT NULL,
    PRIMARY KEY (connection_id, parameter_name),
    FOREIGN KEY (connection_id) REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_sharing_profile_parameter (
    sharing_profile_id INTEGER NOT NULL,
    parameter_name     VARCHAR(128) NOT NULL,
    parameter_value    VARCHAR(4096) NOT NULL,
    PRIMARY KEY (sharing_profile_id, parameter_name),
    FOREIGN KEY (sharing_profile_id) REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_attribute (
    user_id         INTEGER NOT NULL,
    attribute_name  VARCHAR(128) NOT NULL,
    attribute_value VARCHAR(4096) NOT NULL,
    PRIMARY KEY (user_id, attribute_name),
    FOREIGN KEY (user_id) REFERENCES guacamole_user(user_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_group_attribute (
    user_group_id   INTEGER NOT NULL,
    attribute_name  VARCHAR(128) NOT NULL,
    attribute_value VARCHAR(4096) NOT NULL,
    PRIMARY KEY (user_group_id, attribute_name),
    FOREIGN KEY (user_group_id) REFERENCES guacamole_user_group(user_group_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_attribute (
    connection_id   INTEGER NOT NULL,
    attribute_name  VARCHAR(128) NOT NULL,
    attribute_value VARCHAR(4096) NOT NULL,
    PRIMARY KEY (connection_id, attribute_name),
    FOREIGN KEY (connection_id) REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_group_attribute (
    connection_group_id INTEGER NOT NULL,
    attribute_name      VARCHAR(128) NOT NULL,
    attribute_value     VARCHAR(4096) NOT NULL,
    PRIMARY KEY (connection_group_id, attribute_name),
    FOREIGN KEY (connection_group_id) REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_sharing_profile_attribute (
    sharing_profile_id INTEGER NOT NULL,
    attribute_name     VARCHAR(128) NOT NULL,
    attribute_value    VARCHAR(4096) NOT NULL,
    PRIMARY KEY (sharing_profile_id, attribute_name),
    FOREIGN KEY (sharing_profile_id) REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_permission (
    entity_id     INTEGER NOT NULL,
    connection_id INTEGER NOT NULL,
    permission    VARCHAR(16) NOT NULL,
    PRIMARY KEY (entity_id, connection_id, permission),
    FOREIGN KEY (connection_id) REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_group_permission (
    entity_id           INTEGER NOT NULL,
    connection_group_id INTEGER NOT NULL,
    permission          VARCHAR(16) NOT NULL,
    PRIMARY KEY (entity_id, connection_group_id, permission),
    FOREIGN KEY (connection_group_id) REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_sharing_profile_permission (
    entity_id          INTEGER NOT NULL,
    sharing_profile_id INTEGER NOT NULL,
    permission         VARCHAR(16) NOT NULL,
    PRIMARY KEY (entity_id, sharing_profile_id, permission),
    FOREIGN KEY (sharing_profile_id) REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_system_permission (
    entity_id  INTEGER NOT NULL,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (entity_id, permission),
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_permission (
    entity_id        INTEGER NOT NULL,
    affected_user_id INTEGER NOT NULL,
    permission       VARCHAR(16) NOT NULL,
    PRIMARY KEY (entity_id, affected_user_id, permission),
    FOREIGN KEY (affected_user_id) REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_user_group_permission (
    entity_id              INTEGER NOT NULL,
    affected_user_group_id INTEGER NOT NULL,
    permission             VARCHAR(16) NOT NULL,
    PRIMARY KEY (entity_id, affected_user_group_id, permission),
    FOREIGN KEY (affected_user_group_id) REFERENCES guacamole_user_group(user_group_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE
);

CREATE TABLE guacamole_connection_history (
    history_id           SERIAL PRIMARY KEY,
    user_id              INTEGER,
    username             VARCHAR(128) NOT NULL,
    remote_host          VARCHAR(256),
    connection_id        INTEGER,
    connection_name      VARCHAR(128) NOT NULL,
    sharing_profile_id   INTEGER,
    sharing_profile_name VARCHAR(128),
    start_date           TIMESTAMP NOT NULL,
    end_date             TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES guacamole_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (connection_id) REFERENCES guacamole_connection(connection_id) ON DELETE SET NULL,
    FOREIGN KEY (sharing_profile_id) REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE SET NULL
);
CREATE INDEX guac_connection_history_start_date ON guacamole_connection_history(start_date);
CREATE INDEX guac_connection_history_end_date ON guacamole_connection_history(end_date);
CREATE INDEX guac_connection_history_connection_start ON guacamole_connection_history(connection_id, start_date);

CREATE TABLE guacamole_user_history (
    history_id  SERIAL PRIMARY KEY,
    user_id     INTEGER,
    username    VARCHAR(128) NOT NULL,
    remote_host VARCHAR(256),
    start_date  TIMESTAMP NOT NULL,
    end_date    TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES guacamole_user(user_id) ON DELETE SET NULL
);
CREATE INDEX guac_user_history_start_date ON guacamole_user_history(start_date);
CREATE INDEX guac_user_history_end_date ON guacamole_user_history(end_date);
CREATE INDEX guac_user_history_user_start ON guacamole_user_history(user_id, start_date);

CREATE TABLE guacamole_user_password_history (
    password_history_id SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL,
    password_hash       BYTEA NOT NULL,
    password_salt       BYTEA,
    password_date       TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES guacamole_user(user_id) ON DELETE CASCADE
);