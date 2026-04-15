-- Create admin user "guacadmin" with password "guacadmin"
-- Password hash and salt taken from official Guacamole documentation

INSERT INTO guacamole_entity (name, type) VALUES ('guacadmin', 'USER');

INSERT INTO guacamole_user (entity_id, password_hash, password_salt, password_date)
SELECT entity_id,
       decode('CA458A7D494E3BE824F5E1E175A1556C0F8EEF2C2D7DF3633BEC4A29C4411960', 'hex'),
       decode('FE24ADC5E11E2B25288D1704ABE67A79E342ECC26064CE69C5B3177795A82264', 'hex'),
       NOW()
FROM guacamole_entity WHERE name = 'guacadmin';

-- Grant all system permissions to guacadmin
INSERT INTO guacamole_system_permission (entity_id, permission)
SELECT entity_id, permission
FROM (VALUES
    ('guacadmin', 'CREATE_CONNECTION'),
    ('guacadmin', 'CREATE_CONNECTION_GROUP'),
    ('guacadmin', 'CREATE_SHARING_PROFILE'),
    ('guacadmin', 'CREATE_USER'),
    ('guacadmin', 'CREATE_USER_GROUP'),
    ('guacadmin', 'ADMINISTER')
) AS permissions(username, permission)
JOIN guacamole_entity ON permissions.username = guacamole_entity.name AND guacamole_entity.type = 'USER';

-- Grant self permissions (read, update, administer)
INSERT INTO guacamole_user_permission (entity_id, affected_user_id, permission)
SELECT guacamole_entity.entity_id, guacamole_user.user_id, permission
FROM (VALUES
    ('guacadmin', 'guacadmin', 'READ'),
    ('guacadmin', 'guacadmin', 'UPDATE'),
    ('guacadmin', 'guacadmin', 'ADMINISTER')
) AS permissions(username, affected_username, permission)
JOIN guacamole_entity ON permissions.username = guacamole_entity.name AND guacamole_entity.type = 'USER'
JOIN guacamole_entity affected ON permissions.affected_username = affected.name AND affected.type = 'USER'
JOIN guacamole_user ON guacamole_user.entity_id = affected.entity_id;