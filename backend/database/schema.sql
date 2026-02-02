-- tap2dine Database Schema
-- MySQL 8.0+

-- Create database
CREATE DATABASE IF NOT EXISTS tap2dine;
USE tap2dine;

-- Users table (Restaurant owners/admins)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    phone VARCHAR(20),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tables table
CREATE TABLE IF NOT EXISTS tables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    table_number VARCHAR(20) NOT NULL,
    qr_code VARCHAR(100) UNIQUE NOT NULL,
    capacity INT DEFAULT 4,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_table_per_restaurant (restaurant_id, table_number)
);

-- Menu Categories table
CREATE TABLE IF NOT EXISTS menu_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

-- Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    category_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    preparation_time INT DEFAULT 15,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    table_id INT NOT NULL,
    order_number VARCHAR(20) NOT NULL,
    status ENUM('pending', 'received', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
    customer_name VARCHAR(100),
    customer_phone VARCHAR(20),
    special_instructions TEXT,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Order Status History table (for tracking status changes)
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    status ENUM('pending', 'received', 'preparing', 'ready', 'completed', 'cancelled') NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_tables_qr_code ON tables(qr_code);

-- Insert sample data for testing
-- Sample user (password: password123)
INSERT INTO users (email, password, name, phone) VALUES 
('admin@restaurant.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Restaurant Admin', '+1234567890');

-- Sample restaurant
INSERT INTO restaurants (user_id, name, description, address, phone) VALUES 
(1, 'The Good Food Place', 'Delicious food served with love', '123 Main Street, City', '+1234567890');

-- Sample categories
INSERT INTO menu_categories (restaurant_id, name, description, sort_order) VALUES 
(1, 'Appetizers', 'Start your meal right', 1),
(1, 'Main Course', 'Hearty and satisfying dishes', 2),
(1, 'Beverages', 'Refreshing drinks', 3),
(1, 'Desserts', 'Sweet endings', 4);

-- Sample menu items
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_available, is_vegetarian, is_spicy, preparation_time) VALUES 
(1, 1, 'Spring Rolls', 'Crispy vegetable spring rolls with sweet chili sauce', 6.99, TRUE, TRUE, FALSE, 10),
(1, 1, 'Chicken Wings', 'Spicy buffalo chicken wings with ranch dip', 9.99, TRUE, FALSE, TRUE, 15),
(1, 1, 'Soup of the Day', 'Ask your server for today\'s special', 5.99, TRUE, TRUE, FALSE, 5),
(1, 2, 'Grilled Chicken', 'Tender grilled chicken breast with herbs', 14.99, TRUE, FALSE, FALSE, 20),
(1, 2, 'Beef Burger', 'Juicy beef patty with cheese and vegetables', 12.99, TRUE, FALSE, FALSE, 15),
(1, 2, 'Vegetable Pasta', 'Fresh pasta with seasonal vegetables', 11.99, TRUE, TRUE, FALSE, 15),
(1, 2, 'Fish & Chips', 'Crispy battered fish with golden fries', 13.99, TRUE, FALSE, FALSE, 20),
(1, 3, 'Soft Drinks', 'Coca-Cola, Sprite, Fanta', 2.99, TRUE, TRUE, FALSE, 2),
(1, 3, 'Fresh Juice', 'Orange, Apple, or Mixed fruit', 4.99, TRUE, TRUE, FALSE, 5),
(1, 3, 'Coffee', 'Freshly brewed coffee', 3.49, TRUE, TRUE, FALSE, 5),
(1, 4, 'Chocolate Cake', 'Rich chocolate cake with cream', 6.99, TRUE, TRUE, FALSE, 5),
(1, 4, 'Ice Cream', 'Three scoops of your choice', 5.99, TRUE, TRUE, FALSE, 3);

-- Sample tables
INSERT INTO tables (restaurant_id, table_number, qr_code, capacity) VALUES 
(1, 'T1', 'TBL-001-ABC123', 4),
(1, 'T2', 'TBL-002-DEF456', 4),
(1, 'T3', 'TBL-003-GHI789', 6),
(1, 'T4', 'TBL-004-JKL012', 2),
(1, 'T5', 'TBL-005-MNO345', 8);
