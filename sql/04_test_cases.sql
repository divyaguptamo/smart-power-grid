-- ============================================================
-- DBMS MINI PROJECT - DATABASE TEST CASES
-- Run with --force so the script continues past the EXPECTED errors:
--   mysql -u root -p --force smart_power_grid < sql/04_test_cases.sql
-- ============================================================

USE smart_power_grid;

-- TC01 (expect ERROR 3819): plain-text password is rejected by chk_user_password_bcrypt
INSERT INTO `USER` (name, email, password_hash, role, phone)
VALUES ('Test User', 'test@gmail.com', 'password123', 'CONSUMER', '9876500000');

-- TC02 (expect ERROR 3819): invalid email format
INSERT INTO `USER` (name, email, password_hash, role, phone)
VALUES ('Test User', 'not-an-email', '$2a$10$Turw3KECx3QkGYxukhuCOeMNZR0YKMeQK830b54qZzd9/6VlmNvNC', 'CONSUMER', '9876500000');

-- TC03 (expect ERROR 1062): duplicate email violates UNIQUE
INSERT INTO `USER` (name, email, password_hash, role, phone)
VALUES ('Duplicate', 'rahul@gmail.com', '$2a$10$Turw3KECx3QkGYxukhuCOeMNZR0YKMeQK830b54qZzd9/6VlmNvNC', 'CONSUMER', '9876500001');

-- TC04 (expect ERROR 3819): generation above plant capacity
UPDATE POWER_PLANT SET current_generation_mw = 999 WHERE plant_id = 1;

-- TC05 (expect ERROR 1452): allocation pointing to a non-existent zone (foreign key)
INSERT INTO ENERGY_ALLOCATION (plant_id, zone_id, allocated_power_mw, priority_level)
VALUES (1, 99, 10, 2);

-- TC06 (expect ERROR 1644 from trigger): direct insert above plant capacity
INSERT INTO ENERGY_ALLOCATION (plant_id, zone_id, allocated_power_mw, priority_level)
VALUES (2, 1, 500, 2);

-- TC07 (expect ERROR 1644): procedure refuses to exceed zone capacity (zone 4: 70 of 80 MW used)
CALL sp_allocate_power(4, 4, 25, 5, 2, 'Test overload', @id);

-- TC08 (expect SUCCESS): valid allocation through the transactional procedure
CALL sp_allocate_power(4, 4, 5, 5, 2, 'Extra ICU backup load', @id);
SELECT @id AS new_allocation_id;
SELECT zone_name, allocated_power_mw, status FROM GRID_ZONE WHERE zone_id = 4;
SELECT * FROM ALLOCATION_LOG WHERE allocation_id = @id;

-- TC09 (expect SUCCESS + automatic audit row with the real user id 5 and the reason)
CALL sp_update_allocation_power(@id, 8, 5, 'Hospital requested more backup');
SELECT allocation_id, changed_by, old_power_mw, new_power_mw, reason
FROM ALLOCATION_LOG WHERE allocation_id = @id ORDER BY log_id;

-- TC10 (expect ERROR 1644): COMPLETED allocations cannot go back to PENDING
UPDATE ENERGY_ALLOCATION SET status = 'PENDING' WHERE allocation_id = 1;

-- TC11 (expect SUCCESS): reporting an outage marks the zone OUTAGE via trigger
INSERT INTO OUTAGE (zone_id, reported_by, start_time, reason, severity, status)
VALUES (2, 4, NOW(), 'Feeder trip near MG Road', 'MEDIUM', 'ACTIVE');
SELECT zone_id, status FROM GRID_ZONE WHERE zone_id = 2;

-- TC12 (expect SUCCESS): resolving it restores the zone status in one transaction
SET @oid = (SELECT MAX(outage_id) FROM OUTAGE WHERE zone_id = 2);
CALL sp_resolve_outage(@oid);
SELECT outage_id, status, end_time FROM OUTAGE WHERE outage_id = @oid;
SELECT zone_id, status FROM GRID_ZONE WHERE zone_id = 2;

-- TC13 (expect ERROR 1644): resolving the same outage twice
CALL sp_resolve_outage(@oid);

-- TC14 (expect ERROR 3819 and NO partial data): registration rolls back completely
CALL sp_register_consumer('Bad Phone', 'badphone@gmail.com',
  '$2a$10$Turw3KECx3QkGYxukhuCOeMNZR0YKMeQK830b54qZzd9/6VlmNvNC',
  '12345', 'RESIDENTIAL', 'Jayanagar, Bangalore', 1, @uid);
SELECT COUNT(*) AS should_be_zero FROM `USER` WHERE email = 'badphone@gmail.com';

-- TC15 (expect SUCCESS): valid registration creates USER + CONSUMER + METER together
CALL sp_register_consumer('Ananya Iyer', 'ananya@gmail.com',
  '$2a$10$Turw3KECx3QkGYxukhuCOeMNZR0YKMeQK830b54qZzd9/6VlmNvNC',
  '9876543215', 'RESIDENTIAL', 'Jayanagar, Bangalore', 1, @uid);
SELECT * FROM vw_consumer_meters WHERE user_id = @uid;

-- TC16 (expect ERROR 3819): maintenance must target exactly one of plant/resource
INSERT INTO MAINTENANCE (plant_id, resource_id, maintenance_type, scheduled_date, performed_by)
VALUES (1, 1, 'ROUTINE', '2026-11-10', 2);

-- TC17 (expect SUCCESS): starting plant maintenance takes the plant to MAINTENANCE via trigger
UPDATE MAINTENANCE SET status = 'IN_PROGRESS' WHERE maintenance_id = 1;
SELECT plant_id, status FROM POWER_PLANT WHERE plant_id = 1;
UPDATE MAINTENANCE SET status = 'COMPLETED', completion_date = '2026-10-02' WHERE maintenance_id = 1;
SELECT plant_id, status FROM POWER_PLANT WHERE plant_id = 1;

-- TC18 (expect SUCCESS): full-text search
SELECT resource_name, location FROM ENERGY_RESOURCE
WHERE MATCH(resource_name, location) AGAINST('generator' IN NATURAL LANGUAGE MODE);
