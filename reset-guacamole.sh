#!/bin/bash

echo "🔄 Resetting Guacamole setup..."

# Stop containers
echo "⏹️  Stopping containers..."
docker compose down -v

# Clean up
echo "🧹 Cleaning up..."
rm -rf init/
mkdir -p init/

# Create schema file
echo "📝 Creating database schema..."
cat > init/001-create-schema.sql << 'EOFSCHEMA'
CREATE DATABASE IF NOT EXISTS guacamole_db;
USE guacamole_db;

CREATE TABLE guacamole_entity (
  entity_id     int(11)            NOT NULL AUTO_INCREMENT,
  name          varchar(128)       NOT NULL,
  type          enum('USER', 'USER_GROUP') NOT NULL,
  PRIMARY KEY (entity_id),
  UNIQUE KEY guacamole_entity_name_scope (type, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_user (
  user_id       int(11)      NOT NULL AUTO_INCREMENT,
  entity_id     int(11)      NOT NULL,
  password_hash binary(32)   NOT NULL,
  password_salt binary(32),
  password_date datetime     NOT NULL,
  disabled      boolean      NOT NULL DEFAULT 0,
  expired       boolean      NOT NULL DEFAULT 0,
  access_window_start    time,
  access_window_end      time,
  valid_from  date,
  valid_until date,
  timezone varchar(64),
  full_name           varchar(256),
  email_address       varchar(256),
  organization        varchar(256),
  organizational_role varchar(256),
  PRIMARY KEY (user_id),
  UNIQUE KEY guacamole_user_single_entity (entity_id),
  CONSTRAINT guacamole_user_entity
    FOREIGN KEY (entity_id)
    REFERENCES guacamole_entity (entity_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_user_group (
  user_group_id int(11)      NOT NULL AUTO_INCREMENT,
  entity_id     int(11)      NOT NULL,
  disabled      boolean      NOT NULL DEFAULT 0,
  PRIMARY KEY (user_group_id),
  UNIQUE KEY guacamole_user_group_single_entity (entity_id),
  CONSTRAINT guacamole_user_group_entity
    FOREIGN KEY (entity_id)
    REFERENCES guacamole_entity (entity_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_user_group_member (
  user_group_id    int(11)     NOT NULL,
  member_entity_id int(11)     NOT NULL,
  PRIMARY KEY (user_group_id, member_entity_id),
  CONSTRAINT guacamole_user_group_member_parent
    FOREIGN KEY (user_group_id)
    REFERENCES guacamole_user_group (user_group_id) ON DELETE CASCADE,
  CONSTRAINT guacamole_user_group_member_entity
    FOREIGN KEY (member_entity_id)
    REFERENCES guacamole_entity (entity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_connection (
  connection_id       int(11)      NOT NULL AUTO_INCREMENT,
  connection_name     varchar(128) NOT NULL,
  parent_id           int(11),
  protocol            varchar(32)  NOT NULL,
  proxy_port          integer,
  proxy_hostname      varchar(512),
  proxy_encryption_method enum('NONE', 'SSL'),
  max_connections          integer,
  max_connections_per_user integer,
  connection_weight        integer,
  failover_only            boolean NOT NULL DEFAULT 0,
  PRIMARY KEY (connection_id),
  UNIQUE KEY connection_name_parent (connection_name, parent_id),
  CONSTRAINT guacamole_connection_ibfk_1
    FOREIGN KEY (parent_id)
    REFERENCES guacamole_connection (connection_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_connection_parameter (
  connection_id   int(11)       NOT NULL,
  parameter_name  varchar(128)  NOT NULL,
  parameter_value varchar(4096) NOT NULL,
  PRIMARY KEY (connection_id,parameter_name),
  CONSTRAINT guacamole_connection_parameter_ibfk_1
    FOREIGN KEY (connection_id)
    REFERENCES guacamole_connection (connection_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_connection_permission (
  entity_id     int(11) NOT NULL,
  connection_id int(11) NOT NULL,
  permission    enum('READ', 'UPDATE', 'DELETE', 'ADMINISTER') NOT NULL,
  PRIMARY KEY (entity_id,connection_id,permission),
  CONSTRAINT guacamole_connection_permission_ibfk_1
    FOREIGN KEY (connection_id)
    REFERENCES guacamole_connection (connection_id) ON DELETE CASCADE,
  CONSTRAINT guacamole_connection_permission_entity
    FOREIGN KEY (entity_id)
    REFERENCES guacamole_entity (entity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_system_permission (
  entity_id  int(11) NOT NULL,
  permission enum('CREATE_CONNECTION', 'CREATE_CONNECTION_GROUP', 'CREATE_SHARING_PROFILE', 'CREATE_USER', 'CREATE_USER_GROUP', 'ADMINISTER') NOT NULL,
  PRIMARY KEY (entity_id,permission),
  CONSTRAINT guacamole_system_permission_entity
    FOREIGN KEY (entity_id)
    REFERENCES guacamole_entity (entity_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_connection_history (
  history_id           int(11)      NOT NULL AUTO_INCREMENT,
  user_id              int(11)      DEFAULT NULL,
  username             varchar(128) NOT NULL,
  remote_host          varchar(256) DEFAULT NULL,
  connection_id        int(11)      DEFAULT NULL,
  connection_name      varchar(128) NOT NULL,
  sharing_profile_id   int(11)      DEFAULT NULL,
  sharing_profile_name varchar(128) DEFAULT NULL,
  start_date           datetime     NOT NULL,
  end_date             datetime     DEFAULT NULL,
  PRIMARY KEY (history_id),
  KEY guacamole_connection_history_user_id (user_id),
  KEY guacamole_connection_history_connection_id (connection_id),
  CONSTRAINT guacamole_connection_history_ibfk_1
    FOREIGN KEY (user_id)
    REFERENCES guacamole_user (user_id) ON DELETE SET NULL,
  CONSTRAINT guacamole_connection_history_ibfk_2
    FOREIGN KEY (connection_id)
    REFERENCES guacamole_connection (connection_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_user_history (
  history_id           int(11)      NOT NULL AUTO_INCREMENT,
  user_id              int(11)      DEFAULT NULL,
  username             varchar(128) NOT NULL,
  remote_host          varchar(256) DEFAULT NULL,
  start_date           datetime     NOT NULL,
  end_date             datetime     DEFAULT NULL,
  PRIMARY KEY (history_id),
  KEY guacamole_user_history_user_id (user_id),
  CONSTRAINT guacamole_user_history_ibfk_1
    FOREIGN KEY (user_id)
    REFERENCES guacamole_user (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE guacamole_user_password_history (
  password_history_id int(11) NOT NULL AUTO_INCREMENT,
  user_id             int(11) NOT NULL,
  password_hash binary(32) NOT NULL,
  password_salt binary(32),
  password_date datetime   NOT NULL,
  PRIMARY KEY (password_history_id),
  KEY guacamole_user_password_history_user_id (user_id),
  CONSTRAINT guacamole_user_password_history_ibfk_1
    FOREIGN KEY (user_id)
    REFERENCES guacamole_user (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
EOFSCHEMA

# Create admin user
echo "👤 Creating admin user..."
cat > init/002-create-admin-user.sql << 'EOFADMIN'
USE guacamole_db;

INSERT INTO guacamole_entity (name, type) VALUES ('guacadmin', 'USER');
INSERT INTO guacamole_user (entity_id, password_hash, password_salt, password_date)
SELECT
    entity_id,
    UNHEX('CA458A7D494E3BE824F5E1E175A1556C0F8EEF2C2D7DF3633BEC4A29C4411960'),
    UNHEX('FE24ADC5E11E2B25288D1704ABE67A79E342ECC26064CE69C5B3177795A82264'),
    NOW()
FROM guacamole_entity WHERE name = 'guacadmin';

INSERT INTO guacamole_system_permission (entity_id, permission)
SELECT entity_id, permission
FROM (
    SELECT 'guacadmin' AS username, 'CREATE_CONNECTION' AS permission
    UNION SELECT 'guacadmin', 'CREATE_CONNECTION_GROUP'
    UNION SELECT 'guacadmin', 'CREATE_SHARING_PROFILE'
    UNION SELECT 'guacadmin', 'CREATE_USER'
    UNION SELECT 'guacadmin', 'CREATE_USER_GROUP'
    UNION SELECT 'guacadmin', 'ADMINISTER'
) permissions
JOIN guacamole_entity ON permissions.username = guacamole_entity.name AND guacamole_entity.type = 'USER';
EOFADMIN

# Create VNC connection
echo "🖥️  Creating VNC connection..."
cat > init/003-add-vnc-connection.sql << 'EOFVNC'
USE guacamole_db;

INSERT INTO guacamole_connection (connection_name, protocol, max_connections, max_connections_per_user)
VALUES ('Ubuntu Desktop (VNC)', 'vnc', NULL, 1);

SET @connection_id = LAST_INSERT_ID();

INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value) VALUES
(@connection_id, 'hostname', 'vnc-desktop'),
(@connection_id, 'port', '5901'),
(@connection_id, 'password', 'vncpassword'),
(@connection_id, 'color-depth', '24'),
(@connection_id, 'cursor', 'remote'),
(@connection_id, 'autoretry', '5');

SET @admin_entity_id = (SELECT entity_id FROM guacamole_entity WHERE name = 'guacadmin' AND type = 'USER');

INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission) VALUES
(@admin_entity_id, @connection_id, 'READ'),
(@admin_entity_id, @connection_id, 'UPDATE'),
(@admin_entity_id, @connection_id, 'DELETE'),
(@admin_entity_id, @connection_id, 'ADMINISTER');
EOFVNC

# Start containers
echo "🚀 Starting containers..."
docker compose up -d

# Wait for database
echo "⏳ Waiting for database to initialize..."
sleep 20

# Check status
echo "✅ Checking status..."
docker compose ps

# Test authentication
echo "🔐 Testing authentication..."
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=guacadmin&password=guacadmin" \
  http://localhost:8080/guacamole/api/tokens | jq -r '.authToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Authentication failed!"
    echo "📋 Checking Guacamole logs..."
    docker logs guacamole-api --tail 30
else
    echo "✅ Authentication successful! Token: ${TOKEN:0:20}..."
    
    # Test connections
    echo "🔗 Testing connections..."
    curl -s "http://localhost:8080/guacamole/api/session/data/mysql/connections?token=$TOKEN" | jq '.'
fi

echo ""
echo "✅ Setup complete!"
echo "🌐 Guacamole Web UI: http://localhost:8080/guacamole/"
echo "🌐 Next.js App: http://localhost:3000"
echo "👤 Username: guacadmin"
echo "🔑 Password: guacadmin"
