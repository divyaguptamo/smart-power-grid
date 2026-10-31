-- ============================================================
-- DBMS MINI PROJECT - DDL
-- Divya Gupta - PES2UG24CS901 | Vidya Sri Ganesh - PES2UG24CS667
-- A SYSTEM OF SMART POWER GRID MANAGEMENT AND ENERGY RESOURCE ALLOCATION
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_power_grid;
USE smart_power_grid;

-- Step 1 - USER
CREATE TABLE `USER` (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'OPERATOR', 'CONSUMER') NOT NULL,
    phone VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2 - GRID_ZONE
CREATE TABLE GRID_ZONE (
    zone_id INT PRIMARY KEY AUTO_INCREMENT,
    zone_name VARCHAR(100) NOT NULL,
    zone_type ENUM('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'CRITICAL') NOT NULL,
    priority_level INT NOT NULL,
    max_capacity_mw DECIMAL(10,2) NOT NULL,
    current_demand_mw DECIMAL(10,2) NOT NULL DEFAULT 0,
    allocated_power_mw DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('NORMAL', 'HIGH_DEMAND', 'OUTAGE') NOT NULL DEFAULT 'NORMAL',
    reported_level VARCHAR(50)
);

-- Step 3 - POWER_PLANT
CREATE TABLE POWER_PLANT (
    plant_id INT PRIMARY KEY AUTO_INCREMENT,
    plant_name VARCHAR(150) NOT NULL,
    plant_type ENUM('SOLAR', 'WIND', 'HYDRO', 'THERMAL') NOT NULL,
    location VARCHAR(200) NOT NULL,
    capacity_mw DECIMAL(10,2) NOT NULL,
    current_generation_mw DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    commissioned_date DATE
);

-- Step 4 - CONSUMER
CREATE TABLE CONSUMER (
    consumer_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    consumer_type ENUM('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL') NOT NULL,
    address VARCHAR(255) NOT NULL,
    connection_date DATE NOT NULL,
    status ENUM('ACTIVE', 'DISCONNECTED') NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT fk_consumer_user FOREIGN KEY (user_id) REFERENCES `USER`(user_id)
);

-- Step 5 - OUTAGE
CREATE TABLE OUTAGE (
    outage_id INT PRIMARY KEY AUTO_INCREMENT,
    zone_id INT NOT NULL,
    reported_by INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    reason VARCHAR(255),
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    status ENUM('ACTIVE', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT fk_outage_zone FOREIGN KEY (zone_id) REFERENCES GRID_ZONE(zone_id),
    CONSTRAINT fk_outage_user FOREIGN KEY (reported_by) REFERENCES `USER`(user_id),
    CONSTRAINT chk_outage_time CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Step 6 - METER
CREATE TABLE METER (
    meter_id INT PRIMARY KEY AUTO_INCREMENT,
    consumer_id INT NOT NULL,
    zone_id INT NOT NULL,
    meter_type ENUM('SMART', 'STANDARD') NOT NULL,
    installation_date DATE NOT NULL,
    status ENUM('ACTIVE', 'FAULTY', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT fk_meter_consumer FOREIGN KEY (consumer_id) REFERENCES CONSUMER(consumer_id),
    CONSTRAINT fk_meter_zone FOREIGN KEY (zone_id) REFERENCES GRID_ZONE(zone_id)
);

-- Step 7 - ENERGY_ALLOCATION
CREATE TABLE ENERGY_ALLOCATION (
    allocation_id INT PRIMARY KEY AUTO_INCREMENT,
    plant_id INT NOT NULL,
    zone_id INT NOT NULL,
    allocated_power_mw DECIMAL(10,2) NOT NULL,
    allocation_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priority_level INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(500),
    CONSTRAINT fk_allocation_plant FOREIGN KEY (plant_id) REFERENCES POWER_PLANT(plant_id),
    CONSTRAINT fk_allocation_zone FOREIGN KEY (zone_id) REFERENCES GRID_ZONE(zone_id),
    CONSTRAINT chk_allocation_power CHECK (allocated_power_mw > 0)
);

-- Step 8 - ENERGY_RESOURCE
CREATE TABLE ENERGY_RESOURCE (
    resource_id INT PRIMARY KEY AUTO_INCREMENT,
    resource_name VARCHAR(150) NOT NULL,
    resource_type ENUM('BATTERY', 'GENERATOR', 'RESERVE', 'STORAGE') NOT NULL,
    capacity_mw DECIMAL(10,2) NOT NULL,
    available_power_mw DECIMAL(10,2) NOT NULL DEFAULT 0,
    location VARCHAR(200),
    status ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    CONSTRAINT chk_resource_capacity CHECK (capacity_mw >= 0),
    CONSTRAINT chk_resource_available CHECK (available_power_mw >= 0 AND available_power_mw <= capacity_mw)
);

-- Step 9 - RESOURCE_ALLOCATION
CREATE TABLE RESOURCE_ALLOCATION (
    resource_allocation_id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_id INT NOT NULL,
    resource_id INT NOT NULL,
    power_contributed_mw DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_resource_allocation FOREIGN KEY (allocation_id) REFERENCES ENERGY_ALLOCATION(allocation_id),
    CONSTRAINT fk_resource FOREIGN KEY (resource_id) REFERENCES ENERGY_RESOURCE(resource_id),
    CONSTRAINT chk_power_contributed CHECK (power_contributed_mw > 0)
);

-- Step 10 - ALLOCATION_LOG
CREATE TABLE ALLOCATION_LOG (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    allocation_id INT NOT NULL,
    changed_by INT NOT NULL,
    old_power_mw DECIMAL(10,2),
    new_power_mw DECIMAL(10,2),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),
    CONSTRAINT fk_log_allocation FOREIGN KEY (allocation_id) REFERENCES ENERGY_ALLOCATION(allocation_id),
    CONSTRAINT fk_log_user FOREIGN KEY (changed_by) REFERENCES `USER`(user_id)
);

-- Step 11 - MAINTENANCE
CREATE TABLE MAINTENANCE (
    maintenance_id INT PRIMARY KEY AUTO_INCREMENT,
    plant_id INT,
    resource_id INT,
    maintenance_type ENUM('ROUTINE', 'REPAIR', 'EMERGENCY') NOT NULL,
    scheduled_date DATE NOT NULL,
    completion_date DATE,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
    performed_by INT NOT NULL,
    description VARCHAR(500),
    CONSTRAINT fk_maintenance_plant FOREIGN KEY (plant_id) REFERENCES POWER_PLANT(plant_id),
    CONSTRAINT fk_maintenance_resource FOREIGN KEY (resource_id) REFERENCES ENERGY_RESOURCE(resource_id),
    CONSTRAINT fk_maintenance_user FOREIGN KEY (performed_by) REFERENCES `USER`(user_id),
    CONSTRAINT chk_maintenance_target CHECK (
        (plant_id IS NOT NULL AND resource_id IS NULL)
        OR (plant_id IS NULL AND resource_id IS NOT NULL)
    ),
    CONSTRAINT chk_maintenance_dates CHECK (completion_date IS NULL OR completion_date >= scheduled_date)
);

-- Step 12 - ALTER
ALTER TABLE POWER_PLANT ADD CONSTRAINT uq_plant_name UNIQUE (plant_name);

-- Step 13 - CREATE INDEX
CREATE INDEX idx_outage_zone ON OUTAGE(zone_id);
CREATE INDEX idx_meter_zone ON METER(zone_id);
CREATE INDEX idx_allocation_plant ON ENERGY_ALLOCATION(plant_id);
CREATE INDEX idx_allocation_zone ON ENERGY_ALLOCATION(zone_id);
CREATE INDEX idx_resource_allocation_allocation ON RESOURCE_ALLOCATION(allocation_id);
CREATE INDEX idx_log_allocation ON ALLOCATION_LOG(allocation_id);
CREATE INDEX idx_log_changed_by ON ALLOCATION_LOG(changed_by);
CREATE INDEX idx_maintenance_performed_by ON MAINTENANCE(performed_by);

-- Step 14 - Verify indexes
SHOW INDEX FROM ENERGY_ALLOCATION;

-- Step 15 - DROP (demonstration)
CREATE INDEX idx_temp_plant_status ON POWER_PLANT(status);
DROP INDEX idx_temp_plant_status ON POWER_PLANT;

-- Step 16 - CREATE VIEW
CREATE VIEW vw_power_allocation_summary AS
SELECT
    ea.allocation_id, pp.plant_name, gz.zone_name, ea.allocated_power_mw,
    ea.allocation_time, ea.priority_level, ea.status
FROM ENERGY_ALLOCATION ea
JOIN POWER_PLANT pp ON ea.plant_id = pp.plant_id
JOIN GRID_ZONE gz ON ea.zone_id = gz.zone_id;

-- Step 17 - Final verification
SHOW TABLES;
