USE guacamole_db;

-- Check if connection already exists
DELETE FROM guacamole_connection WHERE connection_name = 'Ubuntu Desktop (VNC)';

-- Insert VNC connection
INSERT INTO guacamole_connection (connection_name, protocol, max_connections, max_connections_per_user)
VALUES ('Ubuntu Desktop (VNC)', 'vnc', NULL, 1);

-- Get the connection ID
SET @connection_id = LAST_INSERT_ID();

-- Configure VNC parameters
INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value) VALUES
(@connection_id, 'hostname', 'vnc-desktop'),
(@connection_id, 'port', '5901'),
(@connection_id, 'password', 'vncpassword'),
(@connection_id, 'color-depth', '24'),
(@connection_id, 'swap-red-blue', 'false'),
(@connection_id, 'cursor', 'remote'),
(@connection_id, 'autoretry', '5'),
(@connection_id, 'enable-audio', 'true');

-- Get guacadmin entity_id
SET @admin_entity_id = (SELECT entity_id FROM guacamole_entity WHERE name = 'guacadmin' AND type = 'USER');

-- Grant all permissions to guacadmin
INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission) VALUES
(@admin_entity_id, @connection_id, 'READ'),
(@admin_entity_id, @connection_id, 'UPDATE'),
(@admin_entity_id, @connection_id, 'DELETE'),
(@admin_entity_id, @connection_id, 'ADMINISTER');

-- Verify
SELECT 
    c.connection_id,
    c.connection_name,
    c.protocol,
    GROUP_CONCAT(CONCAT(cp.parameter_name, '=', cp.parameter_value) SEPARATOR ', ') as parameters
FROM guacamole_connection c
LEFT JOIN guacamole_connection_parameter cp ON c.connection_id = cp.connection_id
WHERE c.connection_name = 'Ubuntu Desktop (VNC)'
GROUP BY c.connection_id, c.connection_name, c.protocol;

SELECT 'VNC Connection created successfully!' AS Result;
