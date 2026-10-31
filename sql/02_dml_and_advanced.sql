-- ============================================================
-- DBMS MINI PROJECT
-- Divya Gupta-PES2UG24CS901
-- Vidya Sri Ganesh-PES2UG24CS667
-- PROJECT TITLE:
-- A SYSTEM OF SMART POWER GRID MANAGEMENT AND
-- ENERGY RESOURCE ALLOCATION
--
-- DML + ADVANCED DATABASE FEATURES
-- Database: smart_power_grid
-- ============================================================

USE smart_power_grid;

-- ============================================================
-- PART A: DML - INSERT OPERATIONS
-- ============================================================

-- 1. USER
INSERT INTO `USER`
(name, email, password_hash, role, phone, status)
VALUES
('Arjun Sharma', 'arjun@gmail.com', 'hash001', 'ADMIN', '9876543210', 'ACTIVE'),
('Meera Rao', 'meera@gmail.com', 'hash002', 'OPERATOR', '9876543211', 'ACTIVE'),
('Rahul Kumar', 'rahul@gmail.com', 'hash003', 'CONSUMER', '9876543212', 'ACTIVE'),
('Sneha Patel', 'sneha@gmail.com', 'hash004', 'CONSUMER', '9876543213', 'ACTIVE'),
('Vikram Singh', 'vikram@gmail.com', 'hash005', 'OPERATOR', '9876543214', 'ACTIVE');


SELECT * FROM `USER`;


-- 2. GRID_ZONE
INSERT INTO GRID_ZONE
(zone_name, zone_type, priority_level, max_capacity_mw,
 current_demand_mw, allocated_power_mw, status, reported_level)
VALUES
('North Residential Zone', 'RESIDENTIAL', 2, 100.00, 65.00, 60.00, 'NORMAL', 'LOW'),
('Central Commercial Zone', 'COMMERCIAL', 3, 150.00, 120.00, 110.00, 'HIGH_DEMAND', 'MEDIUM'),
('East Industrial Zone', 'INDUSTRIAL', 4, 250.00, 210.00, 200.00, 'HIGH_DEMAND', 'HIGH'),
('City Hospital Zone', 'CRITICAL', 5, 80.00, 70.00, 70.00, 'NORMAL', 'LOW');


SELECT * FROM GRID_ZONE;


-- 3. POWER_PLANT
INSERT INTO POWER_PLANT
(plant_name, plant_type, location, capacity_mw,
 current_generation_mw, status, commissioned_date)
VALUES
('Green Solar Plant', 'SOLAR', 'Bangalore', 200.00, 150.00, 'ACTIVE', '2022-06-15'),
('Coastal Wind Plant', 'WIND', 'Mangalore', 180.00, 130.00, 'ACTIVE', '2021-09-10'),
('River Hydro Plant', 'HYDRO', 'Shimoga', 300.00, 250.00, 'ACTIVE', '2020-03-20'),
('Thermal Power Station', 'THERMAL', 'Raichur', 500.00, 400.00, 'ACTIVE', '2019-01-10');


SELECT * FROM POWER_PLANT;


-- 4. CONSUMER
INSERT INTO CONSUMER
(user_id, consumer_type, address, connection_date, status)
SELECT user_id, 'RESIDENTIAL', 'Whitefield, Bangalore', '2024-01-15', 'ACTIVE'
FROM `USER`
WHERE email = 'rahul@gmail.com';

INSERT INTO CONSUMER
(user_id, consumer_type, address, connection_date, status)
SELECT user_id, 'COMMERCIAL', 'MG Road, Bangalore', '2024-02-10', 'ACTIVE'
FROM `USER`
WHERE email = 'sneha@gmail.com';


SELECT * FROM CONSUMER;


-- 5. METER
INSERT INTO METER
(consumer_id, zone_id, meter_type, installation_date, status)
VALUES
(1, 1, 'SMART', '2024-01-20', 'ACTIVE'),
(2, 2, 'SMART', '2024-02-15', 'ACTIVE');

SELECT * FROM METER;


-- 6. OUTAGE
INSERT INTO OUTAGE
(zone_id, reported_by, start_time, end_time, reason, severity, status)
VALUES
(1, 1, '2026-09-01 10:00:00', '2026-09-01 12:00:00',
 'Transformer Failure', 'HIGH', 'RESOLVED'),
(2, 2, '2026-09-05 14:00:00', '2026-09-05 15:30:00',
 'Transmission Fault', 'MEDIUM', 'RESOLVED'),
(3, 2, '2026-09-10 09:00:00', NULL,
 'Equipment Failure', 'CRITICAL', 'ACTIVE');


SELECT * FROM OUTAGE;


-- 7. ENERGY_RESOURCE
INSERT INTO ENERGY_RESOURCE
(resource_name, resource_type, capacity_mw, available_power_mw,
 location, status)
VALUES
('Battery Storage A', 'BATTERY', 100.00, 80.00, 'North Zone', 'AVAILABLE'),
('Backup Generator B', 'GENERATOR', 150.00, 120.00, 'Central Zone', 'AVAILABLE'),
('Emergency Reserve C', 'RESERVE', 200.00, 200.00, 'East Zone', 'AVAILABLE'),
('Grid Storage D', 'STORAGE', 120.00, 90.00, 'Central Zone', 'IN_USE');


SELECT * FROM ENERGY_RESOURCE;


-- 8. ENERGY_ALLOCATION
INSERT INTO ENERGY_ALLOCATION
(plant_id, zone_id, allocated_power_mw,
 allocation_time, priority_level, status, notes)
VALUES
(1, 1, 50.00, '2026-09-20 10:00:00', 2, 'COMPLETED',
 'Residential demand allocation'),
(2, 2, 80.00, '2026-09-20 11:00:00', 3, 'APPROVED',
 'Commercial demand allocation'),
(3, 3, 120.00, '2026-09-20 12:00:00', 4, 'COMPLETED',
 'Industrial power requirement'),
(4, 4, 60.00, '2026-09-20 13:00:00', 5, 'PENDING',
 'Critical hospital requirement');


SELECT * FROM ENERGY_ALLOCATION;


-- 9. RESOURCE_ALLOCATION
INSERT INTO RESOURCE_ALLOCATION
(allocation_id, resource_id, power_contributed_mw)
VALUES
(1, 1, 20.00),
(2, 2, 40.00),
(3, 3, 60.00),
(4, 4, 30.00);

-- 10. ALLOCATION_LOG
INSERT INTO ALLOCATION_LOG
(allocation_id, changed_by, old_power_mw, new_power_mw, reason)
VALUES
(1, 2, 40.00, 50.00, 'Increased residential demand'),
(2, 2, 70.00, 80.00, 'Commercial peak demand'),
(3, 5, 100.00, 120.00, 'Industrial requirement');

-- 11. MAINTENANCE
INSERT INTO MAINTENANCE
(plant_id, resource_id, maintenance_type,
 scheduled_date, completion_date, status,
 performed_by, description)
VALUES
(1, NULL, 'ROUTINE', '2026-10-01', NULL,
 'SCHEDULED', 2, 'Solar panel inspection'),
(NULL, 2, 'REPAIR', '2026-09-25', '2026-09-27',
 'COMPLETED', 5, 'Generator maintenance'),
(3, NULL, 'EMERGENCY', '2026-09-20', '2026-09-21',
 'COMPLETED', 2, 'Hydro turbine repair');


SELECT * FROM RESOURCE_ALLOCATION;
SELECT * FROM ALLOCATION_LOG;
SELECT * FROM MAINTENANCE;


-- ============================================================
-- PART B: DML - UPDATE
-- ============================================================


UPDATE POWER_PLANT
SET current_generation_mw = 175.00
WHERE plant_id = 1;

SELECT *
FROM POWER_PLANT
WHERE plant_id = 1;



UPDATE GRID_ZONE
SET status = 'HIGH_DEMAND',
    reported_level = 'HIGH'
WHERE zone_id = 1;

SELECT *
FROM GRID_ZONE
WHERE zone_id = 1;


-- ============================================================
-- PART C: DML - DELETE
-- ============================================================

-- Insert a temporary record, verify it, delete it, then verify again.

INSERT INTO ENERGY_RESOURCE
(resource_name, resource_type, capacity_mw,
 available_power_mw, location, status)
VALUES
('Temporary Generator', 'GENERATOR', 50.00, 50.00,
 'Test Location', 'AVAILABLE');

SELECT *
FROM ENERGY_RESOURCE
WHERE resource_name = 'Temporary Generator';

DELETE FROM ENERGY_RESOURCE
WHERE resource_name = 'Temporary Generator';

SELECT *
FROM ENERGY_RESOURCE
WHERE resource_name = 'Temporary Generator';


-- ============================================================
-- PART D: SELECT / ORDER BY
-- ============================================================


SELECT
    plant_name,
    plant_type,
    capacity_mw,
    current_generation_mw
FROM POWER_PLANT
ORDER BY capacity_mw DESC;


-- ============================================================
-- PART E: JOIN QUERIES
-- ============================================================


SELECT
    ea.allocation_id,
    pp.plant_name,
    gz.zone_name,
    ea.allocated_power_mw,
    ea.priority_level,
    ea.status
FROM ENERGY_ALLOCATION ea
JOIN POWER_PLANT pp
    ON ea.plant_id = pp.plant_id
JOIN GRID_ZONE gz
    ON ea.zone_id = gz.zone_id;



SELECT
    c.consumer_id,
    u.name,
    u.email,
    c.consumer_type,
    c.address,
    c.status
FROM CONSUMER c
JOIN `USER` u
    ON c.user_id = u.user_id;


-- ============================================================
-- PART F: AGGREGATE FUNCTIONS
-- ============================================================


SELECT
    COUNT(*) AS total_plants,
    SUM(capacity_mw) AS total_capacity,
    AVG(capacity_mw) AS average_capacity,
    MAX(capacity_mw) AS maximum_capacity,
    MIN(capacity_mw) AS minimum_capacity
FROM POWER_PLANT;


-- ============================================================
-- PART G: GROUP BY
-- ============================================================


SELECT
    pp.plant_name,
    SUM(ea.allocated_power_mw) AS total_allocated_power
FROM ENERGY_ALLOCATION ea
JOIN POWER_PLANT pp
    ON ea.plant_id = pp.plant_id
GROUP BY pp.plant_name;


-- ============================================================
-- PART H: HAVING
-- ============================================================


SELECT
    pp.plant_name,
    SUM(ea.allocated_power_mw) AS total_allocated_power
FROM ENERGY_ALLOCATION ea
JOIN POWER_PLANT pp
    ON ea.plant_id = pp.plant_id
GROUP BY pp.plant_name
HAVING SUM(ea.allocated_power_mw) > 100;


-- ============================================================
-- PART I: SUBQUERY
-- ============================================================


SELECT
    plant_name,
    capacity_mw
FROM POWER_PLANT
WHERE capacity_mw >
(
    SELECT AVG(capacity_mw)
    FROM POWER_PLANT
);


-- ============================================================
-- PART J: COMPLEX QUERY
-- JOIN + GROUP BY + HAVING + ORDER BY + AGGREGATES
-- ============================================================


SELECT
    gz.zone_name,
    gz.zone_type,
    COUNT(ea.allocation_id) AS number_of_allocations,
    SUM(ea.allocated_power_mw) AS total_power_allocated,
    AVG(ea.allocated_power_mw) AS average_power_allocated
FROM GRID_ZONE gz
JOIN ENERGY_ALLOCATION ea
    ON gz.zone_id = ea.zone_id
GROUP BY
    gz.zone_id,
    gz.zone_name,
    gz.zone_type
HAVING SUM(ea.allocated_power_mw) > 50
ORDER BY total_power_allocated DESC;


-- ============================================================
-- PART K: ADVANCED DATABASE FEATURE 1 - VIEW
-- Already created in the DDL, so this only verifies it.
-- ============================================================


SELECT *
FROM vw_power_allocation_summary;


-- ============================================================
-- PART L: ADVANCED DATABASE FEATURE 2 - TRANSACTIONS
-- ============================================================


START TRANSACTION;

UPDATE ENERGY_ALLOCATION
SET allocated_power_mw = allocated_power_mw + 10
WHERE allocation_id = 1;

UPDATE GRID_ZONE
SET allocated_power_mw = allocated_power_mw + 10
WHERE zone_id = 1;

COMMIT;

SELECT *
FROM ENERGY_ALLOCATION
WHERE allocation_id = 1;

SELECT *
FROM GRID_ZONE
WHERE zone_id = 1;



START TRANSACTION;

UPDATE ENERGY_ALLOCATION
SET allocated_power_mw = 999.00
WHERE allocation_id = 1;

SELECT allocated_power_mw
FROM ENERGY_ALLOCATION
WHERE allocation_id = 1;

ROLLBACK;

SELECT allocated_power_mw
FROM ENERGY_ALLOCATION
WHERE allocation_id = 1;


-- ============================================================
-- PART M: ADVANCED DATABASE FEATURE 3 - TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_allocation_update_log;

DELIMITER //

CREATE TRIGGER trg_allocation_update_log
AFTER UPDATE ON ENERGY_ALLOCATION
FOR EACH ROW
BEGIN
    IF OLD.allocated_power_mw <> NEW.allocated_power_mw THEN
        INSERT INTO ALLOCATION_LOG
        (
            allocation_id,
            changed_by,
            old_power_mw,
            new_power_mw,
            changed_at,
            reason
        )
        VALUES
        (
            NEW.allocation_id,
            2,
            OLD.allocated_power_mw,
            NEW.allocated_power_mw,
            CURRENT_TIMESTAMP,
            'Power allocation updated'
        );
    END IF;
END //

DELIMITER ;


UPDATE ENERGY_ALLOCATION
SET allocated_power_mw = allocated_power_mw + 20
WHERE allocation_id = 1;

SELECT *
FROM ALLOCATION_LOG
WHERE allocation_id = 1
ORDER BY changed_at DESC;


SHOW TRIGGERS;


-- ============================================================
-- PART N: ADVANCED DATABASE FEATURE 4 - STORED PROCEDURE
-- ============================================================

DROP PROCEDURE IF EXISTS GetZoneAllocations;

DELIMITER //

CREATE PROCEDURE GetZoneAllocations(IN p_zone_id INT)
BEGIN
    SELECT
        ea.allocation_id,
        pp.plant_name,
        gz.zone_name,
        ea.allocated_power_mw,
        ea.priority_level,
        ea.status,
        ea.allocation_time
    FROM ENERGY_ALLOCATION ea
    JOIN POWER_PLANT pp
        ON ea.plant_id = pp.plant_id
    JOIN GRID_ZONE gz
        ON ea.zone_id = gz.zone_id
    WHERE ea.zone_id = p_zone_id
    ORDER BY ea.allocation_time DESC;
END //

DELIMITER ;


CALL GetZoneAllocations(1);


SHOW PROCEDURE STATUS
WHERE Db = 'smart_power_grid';


-- ============================================================
-- PART O: ADVANCED DATABASE FEATURE 5 - STORED FUNCTION
-- ============================================================

DROP FUNCTION IF EXISTS CalculatePlantUtilization;

DELIMITER //

CREATE FUNCTION CalculatePlantUtilization(p_plant_id INT)
RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
    DECLARE utilization DECIMAL(5,2);

    SELECT
        (current_generation_mw / NULLIF(capacity_mw, 0)) * 100
    INTO utilization
    FROM POWER_PLANT
    WHERE plant_id = p_plant_id;

    RETURN utilization;
END //

DELIMITER ;


SELECT
    plant_id,
    plant_name,
    capacity_mw,
    current_generation_mw,
    CalculatePlantUtilization(plant_id) AS utilization_percentage
FROM POWER_PLANT;


SHOW FUNCTION STATUS
WHERE Db = 'smart_power_grid';


-- ============================================================
-- PART P: ADVANCED DATABASE FEATURE 6 - FULL-TEXT SEARCH
-- ============================================================


ALTER TABLE ENERGY_RESOURCE
ADD FULLTEXT INDEX ft_resource_search
(resource_name, location);

SHOW INDEX FROM ENERGY_RESOURCE;


SELECT
    resource_id,
    resource_name,
    resource_type,
    capacity_mw,
    available_power_mw,
    location,
    status
FROM ENERGY_RESOURCE
WHERE MATCH(resource_name, location)
AGAINST('storage' IN NATURAL LANGUAGE MODE);



SELECT
    resource_id,
    resource_name,
    resource_type,
    location,
    status
FROM ENERGY_RESOURCE
WHERE MATCH(resource_name, location)
AGAINST('Central' IN NATURAL LANGUAGE MODE);


-- ============================================================
-- FINAL VERIFICATION
-- ============================================================

SELECT * FROM `USER`;
SELECT * FROM GRID_ZONE;
SELECT * FROM POWER_PLANT;
SELECT * FROM CONSUMER;
SELECT * FROM OUTAGE;
SELECT * FROM METER;
SELECT * FROM ENERGY_ALLOCATION;
SELECT * FROM ENERGY_RESOURCE;
SELECT * FROM RESOURCE_ALLOCATION;
SELECT * FROM ALLOCATION_LOG;
SELECT * FROM MAINTENANCE;

SELECT * FROM vw_power_allocation_summary;


