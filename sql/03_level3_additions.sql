-- ============================================================
-- DBMS MINI PROJECT - LEVEL 3 ADDITIONS (used by the Next.js app)
-- Divya Gupta - PES2UG24CS901 | Vidya Sri Ganesh - PES2UG24CS667
-- Run AFTER 01_ddl.sql and 02_dml_and_advanced.sql
--   mysql -u root -p < sql/03_level3_additions.sql
-- ============================================================

USE smart_power_grid;

-- ============================================================
-- SECTION 1: SECURITY - replace placeholder hashes with bcrypt
-- Demo password for every seeded account: Grid@2026
-- ============================================================

UPDATE `USER`
SET password_hash = '$2a$10$Turw3KECx3QkGYxukhuCOeMNZR0YKMeQK830b54qZzd9/6VlmNvNC'
WHERE password_hash NOT LIKE '$2%';

-- From now on the database itself refuses anything that is not a bcrypt hash,
-- so a plain-text password can never be stored, even by a buggy client.
ALTER TABLE `USER`
    ADD CONSTRAINT chk_user_password_bcrypt
        CHECK (password_hash LIKE '$2_$%' AND CHAR_LENGTH(password_hash) = 60),
    ADD CONSTRAINT chk_user_email
        CHECK (email LIKE '%_@_%._%'),
    ADD CONSTRAINT chk_user_phone
        CHECK (phone IS NULL OR phone REGEXP '^[6-9][0-9]{9}$');

-- ============================================================
-- SECTION 2: DATA VALIDATION - additional database-level constraints
-- ============================================================

ALTER TABLE GRID_ZONE
    ADD CONSTRAINT chk_zone_priority  CHECK (priority_level BETWEEN 1 AND 5),
    ADD CONSTRAINT chk_zone_capacity  CHECK (max_capacity_mw > 0),
    ADD CONSTRAINT chk_zone_demand    CHECK (current_demand_mw >= 0),
    ADD CONSTRAINT chk_zone_allocated CHECK (allocated_power_mw >= 0 AND allocated_power_mw <= max_capacity_mw),
    ADD CONSTRAINT uq_zone_name UNIQUE (zone_name);

ALTER TABLE POWER_PLANT
    ADD CONSTRAINT chk_plant_capacity   CHECK (capacity_mw > 0),
    ADD CONSTRAINT chk_plant_generation CHECK (current_generation_mw >= 0 AND current_generation_mw <= capacity_mw);

ALTER TABLE ENERGY_ALLOCATION
    ADD CONSTRAINT chk_allocation_priority CHECK (priority_level BETWEEN 1 AND 5);

-- One user has at most one consumer profile (1 : 0..1 in the ER diagram)
ALTER TABLE CONSUMER
    ADD CONSTRAINT uq_consumer_user UNIQUE (user_id);

-- ============================================================
-- SECTION 3: INDEXES for the app's most frequent queries
-- ============================================================

CREATE INDEX idx_allocation_status_time ON ENERGY_ALLOCATION (status, allocation_time);
CREATE INDEX idx_outage_status_zone     ON OUTAGE (status, zone_id);
CREATE INDEX idx_maintenance_status     ON MAINTENANCE (status, scheduled_date);

-- Bring zones that already have an active outage into a consistent state
UPDATE GRID_ZONE gz
SET gz.status = 'OUTAGE'
WHERE EXISTS (SELECT 1 FROM OUTAGE o WHERE o.zone_id = gz.zone_id AND o.status = 'ACTIVE');

-- ============================================================
-- SECTION 4: VIEWS used by the dashboard
-- ============================================================

DROP VIEW IF EXISTS vw_zone_load;
CREATE VIEW vw_zone_load AS
SELECT
    gz.zone_id,
    gz.zone_name,
    gz.zone_type,
    gz.priority_level,
    gz.max_capacity_mw,
    gz.current_demand_mw,
    gz.allocated_power_mw,
    ROUND(gz.allocated_power_mw / gz.max_capacity_mw * 100, 2) AS load_pct,
    GREATEST(gz.current_demand_mw - gz.allocated_power_mw, 0)  AS deficit_mw,
    gz.status,
    gz.reported_level,
    (SELECT COUNT(*) FROM OUTAGE o
      WHERE o.zone_id = gz.zone_id AND o.status = 'ACTIVE')     AS active_outages,
    (SELECT COUNT(*) FROM METER m WHERE m.zone_id = gz.zone_id) AS meter_count
FROM GRID_ZONE gz;

DROP VIEW IF EXISTS vw_plant_headroom;
CREATE VIEW vw_plant_headroom AS
SELECT
    pp.plant_id,
    pp.plant_name,
    pp.plant_type,
    pp.location,
    pp.status,
    pp.capacity_mw,
    pp.current_generation_mw,
    COALESCE(SUM(CASE WHEN ea.status IN ('PENDING','APPROVED')
                      THEN ea.allocated_power_mw END), 0)            AS committed_mw,
    pp.capacity_mw - COALESCE(SUM(CASE WHEN ea.status IN ('PENDING','APPROVED')
                      THEN ea.allocated_power_mw END), 0)            AS headroom_mw
FROM POWER_PLANT pp
LEFT JOIN ENERGY_ALLOCATION ea ON ea.plant_id = pp.plant_id
GROUP BY pp.plant_id, pp.plant_name, pp.plant_type, pp.location,
         pp.status, pp.capacity_mw, pp.current_generation_mw;

DROP VIEW IF EXISTS vw_consumer_meters;
CREATE VIEW vw_consumer_meters AS
SELECT
    m.meter_id, m.meter_type, m.status AS meter_status, m.installation_date,
    c.consumer_id, c.consumer_type, c.address,
    u.user_id, u.name AS consumer_name, u.email,
    gz.zone_id, gz.zone_name, gz.status AS zone_status
FROM METER m
JOIN CONSUMER c  ON m.consumer_id = c.consumer_id
JOIN `USER` u    ON c.user_id = u.user_id
JOIN GRID_ZONE gz ON m.zone_id = gz.zone_id;

-- ============================================================
-- SECTION 5: STORED FUNCTION - remaining capacity of a plant
-- ============================================================

DROP FUNCTION IF EXISTS fn_plant_headroom;
DELIMITER //
CREATE FUNCTION fn_plant_headroom(p_plant_id INT)
RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_capacity  DECIMAL(10,2);
    DECLARE v_committed DECIMAL(10,2);

    SELECT capacity_mw INTO v_capacity FROM POWER_PLANT WHERE plant_id = p_plant_id;

    SELECT COALESCE(SUM(allocated_power_mw), 0) INTO v_committed
    FROM ENERGY_ALLOCATION
    WHERE plant_id = p_plant_id AND status IN ('PENDING', 'APPROVED');

    RETURN v_capacity - v_committed;
END //
DELIMITER ;

-- ============================================================
-- SECTION 6: TRIGGERS
-- ============================================================

-- 6a. Audit trigger (replaces the earlier version): records WHO made the change.
--     The app sets @app_user_id / @app_reason on the same connection before updating.
DROP TRIGGER IF EXISTS trg_allocation_update_log;
DELIMITER //
CREATE TRIGGER trg_allocation_update_log
AFTER UPDATE ON ENERGY_ALLOCATION
FOR EACH ROW
BEGIN
    IF OLD.allocated_power_mw <> NEW.allocated_power_mw THEN
        INSERT INTO ALLOCATION_LOG
            (allocation_id, changed_by, old_power_mw, new_power_mw, changed_at, reason)
        VALUES
            (NEW.allocation_id,
             COALESCE(@app_user_id, 2),
             OLD.allocated_power_mw,
             NEW.allocated_power_mw,
             CURRENT_TIMESTAMP,
             COALESCE(@app_reason, 'Power allocation updated'));
    END IF;
END //
DELIMITER ;

-- 6b. Validation trigger: no allocation from an inactive plant or beyond plant capacity,
--     even if someone bypasses the stored procedure and inserts directly.
DROP TRIGGER IF EXISTS trg_allocation_before_insert;
DELIMITER //
CREATE TRIGGER trg_allocation_before_insert
BEFORE INSERT ON ENERGY_ALLOCATION
FOR EACH ROW
BEGIN
    DECLARE v_status   VARCHAR(20);
    DECLARE v_capacity DECIMAL(10,2);

    SELECT status, capacity_mw INTO v_status, v_capacity
    FROM POWER_PLANT WHERE plant_id = NEW.plant_id;

    IF v_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation rejected: power plant is not ACTIVE';
    END IF;

    IF NEW.allocated_power_mw > v_capacity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation rejected: exceeds plant capacity';
    END IF;
END //
DELIMITER ;

-- 6c. Status-flow trigger: allocations move only forward PENDING -> APPROVED -> COMPLETED
DROP TRIGGER IF EXISTS trg_allocation_before_update;
DELIMITER //
CREATE TRIGGER trg_allocation_before_update
BEFORE UPDATE ON ENERGY_ALLOCATION
FOR EACH ROW
BEGIN
    IF (OLD.status = 'COMPLETED' AND NEW.status <> 'COMPLETED')
       OR (OLD.status = 'APPROVED' AND NEW.status = 'PENDING') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid status change: allocations can only move forward';
    END IF;

    IF OLD.status = 'COMPLETED' AND OLD.allocated_power_mw <> NEW.allocated_power_mw THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Completed allocations cannot be modified';
    END IF;
END //
DELIMITER ;

-- 6d. When an outage is reported, the zone is marked OUTAGE automatically
DROP TRIGGER IF EXISTS trg_outage_after_insert;
DELIMITER //
CREATE TRIGGER trg_outage_after_insert
AFTER INSERT ON OUTAGE
FOR EACH ROW
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        UPDATE GRID_ZONE SET status = 'OUTAGE' WHERE zone_id = NEW.zone_id;
    END IF;
END //
DELIMITER ;

-- 6e. Plant maintenance drives plant status
DROP TRIGGER IF EXISTS trg_maintenance_status;
DELIMITER //
CREATE TRIGGER trg_maintenance_status
AFTER UPDATE ON MAINTENANCE
FOR EACH ROW
BEGIN
    IF NEW.plant_id IS NOT NULL AND OLD.status <> NEW.status THEN
        IF NEW.status = 'IN_PROGRESS' THEN
            UPDATE POWER_PLANT SET status = 'MAINTENANCE' WHERE plant_id = NEW.plant_id;
        ELSEIF NEW.status = 'COMPLETED' THEN
            UPDATE POWER_PLANT SET status = 'ACTIVE' WHERE plant_id = NEW.plant_id;
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- SECTION 7: STORED PROCEDURES WITH TRANSACTIONS
-- Every procedure is all-or-nothing: any error rolls back and is re-raised
-- to the API, which shows the message to the user.
-- ============================================================

-- 7a. Create a new allocation (checks plant headroom + zone capacity under row locks)
DROP PROCEDURE IF EXISTS sp_allocate_power;
DELIMITER //
CREATE PROCEDURE sp_allocate_power(
    IN  p_plant_id INT,
    IN  p_zone_id  INT,
    IN  p_power    DECIMAL(10,2),
    IN  p_priority INT,
    IN  p_user_id  INT,
    IN  p_notes    VARCHAR(500),
    OUT p_allocation_id INT
)
BEGIN
    DECLARE v_plant_status VARCHAR(20);
    DECLARE v_headroom     DECIMAL(10,2);
    DECLARE v_zone_max     DECIMAL(10,2);
    DECLARE v_zone_alloc   DECIMAL(10,2);
    DECLARE v_zone_status  VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_power IS NULL OR p_power <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocated power must be greater than 0 MW';
    END IF;

    START TRANSACTION;

    -- lock the plant row so two operators cannot over-commit the same plant
    SELECT status INTO v_plant_status
    FROM POWER_PLANT WHERE plant_id = p_plant_id FOR UPDATE;

    IF v_plant_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Power plant not found';
    END IF;

    SET v_headroom = fn_plant_headroom(p_plant_id);
    IF p_power > v_headroom THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough plant headroom for this allocation';
    END IF;

    SELECT max_capacity_mw, allocated_power_mw, status
      INTO v_zone_max, v_zone_alloc, v_zone_status
    FROM GRID_ZONE WHERE zone_id = p_zone_id FOR UPDATE;

    IF v_zone_max IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grid zone not found';
    END IF;

    IF v_zone_alloc + p_power > v_zone_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation would exceed the zone''s maximum capacity';
    END IF;

    INSERT INTO ENERGY_ALLOCATION
        (plant_id, zone_id, allocated_power_mw, allocation_time, priority_level, status, notes)
    VALUES
        (p_plant_id, p_zone_id, p_power, NOW(), p_priority, 'PENDING', p_notes);

    SET p_allocation_id = LAST_INSERT_ID();

    UPDATE GRID_ZONE
    SET allocated_power_mw = allocated_power_mw + p_power,
        status = CASE
                   WHEN v_zone_status = 'OUTAGE' THEN 'OUTAGE'
                   WHEN allocated_power_mw >= 0.9 * max_capacity_mw THEN 'HIGH_DEMAND'
                   ELSE status
                 END
    WHERE zone_id = p_zone_id;

    INSERT INTO ALLOCATION_LOG (allocation_id, changed_by, old_power_mw, new_power_mw, reason)
    VALUES (p_allocation_id, p_user_id, NULL, p_power, CONCAT('New allocation. ', COALESCE(p_notes, '')));

    COMMIT;
END //
DELIMITER ;

-- 7b. Change the power of an existing allocation (zone total adjusted by the delta)
DROP PROCEDURE IF EXISTS sp_update_allocation_power;
DELIMITER //
CREATE PROCEDURE sp_update_allocation_power(
    IN p_allocation_id INT,
    IN p_new_power     DECIMAL(10,2),
    IN p_user_id       INT,
    IN p_reason        VARCHAR(255)
)
BEGIN
    DECLARE v_old_power DECIMAL(10,2);
    DECLARE v_zone_id   INT;
    DECLARE v_plant_id  INT;
    DECLARE v_delta     DECIMAL(10,2);
    DECLARE v_zone_max  DECIMAL(10,2);
    DECLARE v_zone_alloc DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @app_user_id = NULL, @app_reason = NULL;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT allocated_power_mw, zone_id, plant_id
      INTO v_old_power, v_zone_id, v_plant_id
    FROM ENERGY_ALLOCATION WHERE allocation_id = p_allocation_id FOR UPDATE;

    IF v_old_power IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Allocation not found';
    END IF;

    SET v_delta = p_new_power - v_old_power;

    IF v_delta > 0 AND v_delta > fn_plant_headroom(v_plant_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough plant headroom for this increase';
    END IF;

    SELECT max_capacity_mw, allocated_power_mw INTO v_zone_max, v_zone_alloc
    FROM GRID_ZONE WHERE zone_id = v_zone_id FOR UPDATE;

    IF v_zone_alloc + v_delta > v_zone_max THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Change would exceed the zone''s maximum capacity';
    END IF;

    -- read by trg_allocation_update_log
    SET @app_user_id = p_user_id, @app_reason = p_reason;

    UPDATE ENERGY_ALLOCATION SET allocated_power_mw = p_new_power
    WHERE allocation_id = p_allocation_id;

    UPDATE GRID_ZONE
    SET allocated_power_mw = GREATEST(allocated_power_mw + v_delta, 0)
    WHERE zone_id = v_zone_id;

    SET @app_user_id = NULL, @app_reason = NULL;
    COMMIT;
END //
DELIMITER ;

-- 7c. Resolve an outage and restore the zone status
DROP PROCEDURE IF EXISTS sp_resolve_outage;
DELIMITER //
CREATE PROCEDURE sp_resolve_outage(IN p_outage_id INT)
BEGIN
    DECLARE v_zone_id INT;
    DECLARE v_remaining INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT zone_id INTO v_zone_id
    FROM OUTAGE WHERE outage_id = p_outage_id AND status = 'ACTIVE' FOR UPDATE;

    IF v_zone_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Outage not found or already resolved';
    END IF;

    UPDATE OUTAGE
    SET status = 'RESOLVED', end_time = GREATEST(NOW(), start_time)
    WHERE outage_id = p_outage_id;

    SELECT COUNT(*) INTO v_remaining
    FROM OUTAGE WHERE zone_id = v_zone_id AND status = 'ACTIVE';

    IF v_remaining = 0 THEN
        UPDATE GRID_ZONE
        SET status = IF(allocated_power_mw >= 0.9 * max_capacity_mw
                        OR current_demand_mw > allocated_power_mw, 'HIGH_DEMAND', 'NORMAL')
        WHERE zone_id = v_zone_id;
    END IF;

    COMMIT;
END //
DELIMITER ;

-- 7d. Register a consumer: USER + CONSUMER + METER in one transaction
DROP PROCEDURE IF EXISTS sp_register_consumer;
DELIMITER //
CREATE PROCEDURE sp_register_consumer(
    IN  p_name          VARCHAR(100),
    IN  p_email         VARCHAR(150),
    IN  p_password_hash VARCHAR(255),
    IN  p_phone         VARCHAR(20),
    IN  p_consumer_type VARCHAR(20),
    IN  p_address       VARCHAR(255),
    IN  p_zone_id       INT,
    OUT p_user_id       INT
)
BEGIN
    DECLARE v_consumer_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO `USER` (name, email, password_hash, role, phone, status)
    VALUES (p_name, p_email, p_password_hash, 'CONSUMER', p_phone, 'ACTIVE');
    SET p_user_id = LAST_INSERT_ID();

    INSERT INTO CONSUMER (user_id, consumer_type, address, connection_date, status)
    VALUES (p_user_id, p_consumer_type, p_address, CURDATE(), 'ACTIVE');
    SET v_consumer_id = LAST_INSERT_ID();

    INSERT INTO METER (consumer_id, zone_id, meter_type, installation_date, status)
    VALUES (v_consumer_id, p_zone_id, 'SMART', CURDATE(), 'ACTIVE');

    COMMIT;
END //
DELIMITER ;

-- ============================================================
-- SECTION 8: VERIFICATION
-- ============================================================

SELECT * FROM vw_zone_load;
SELECT * FROM vw_plant_headroom;
SELECT * FROM vw_consumer_meters;
SHOW TRIGGERS;
SHOW PROCEDURE STATUS WHERE Db = 'smart_power_grid';
