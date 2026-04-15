-- Add VNC connection to the test container
INSERT INTO guacamole_connection (connection_name, protocol, max_connections, max_connections_per_user)
VALUES ('Ubuntu Desktop (VNC)', 'vnc', NULL, 1);

DO $$
DECLARE
    conn_id INTEGER;
    admin_entity_id INTEGER;
BEGIN
    SELECT currval('guacamole_connection_connection_id_seq') INTO conn_id;

    INSERT INTO guacamole_connection_parameter (connection_id, parameter_name, parameter_value) VALUES
        (conn_id, 'hostname', 'vnc-desktop'),
        (conn_id, 'port', '5901'),
        (conn_id, 'password', '53J7Qr28SuT6w5'),
        (conn_id, 'color-depth', '24'),
        (conn_id, 'cursor', 'remote'),
        (conn_id, 'autoretry', '5');

    SELECT entity_id INTO admin_entity_id FROM guacamole_entity WHERE name = 'guacadmin' AND type = 'USER';

    INSERT INTO guacamole_connection_permission (entity_id, connection_id, permission) VALUES
        (admin_entity_id, conn_id, 'READ'),
        (admin_entity_id, conn_id, 'UPDATE'),
        (admin_entity_id, conn_id, 'DELETE'),
        (admin_entity_id, conn_id, 'ADMINISTER');

    RAISE NOTICE 'VNC connection created with ID %', conn_id;
END $$;