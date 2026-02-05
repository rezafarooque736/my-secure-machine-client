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

SELECT 'VNC connection created!' AS Result;
