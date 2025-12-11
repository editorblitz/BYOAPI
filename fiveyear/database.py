#!/usr/bin/env python3
"""
Database schema and operations for NGI price data storage
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PriceDatabase:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.getenv('DATABASE_PATH', 'price_data.db')
        self.init_database()

    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Create locations table for reference data
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS locations (
                    location_code TEXT PRIMARY KEY,
                    location_name TEXT NOT NULL,
                    region_name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Create price_data table for historical data
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS price_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    point_code TEXT NOT NULL,
                    issue_date DATE,
                    trade_date DATE NOT NULL,
                    region_name TEXT,
                    location_name TEXT,
                    low REAL,
                    high REAL,
                    average REAL,
                    volume INTEGER,
                    deals INTEGER,
                    flow_start_date DATE,
                    flow_end_date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(point_code, trade_date, flow_start_date, flow_end_date)
                )
            ''')

            # Create indexes for better query performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_price_data_point_code
                ON price_data(point_code)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_price_data_trade_date
                ON price_data(trade_date)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_price_data_flow_dates
                ON price_data(flow_start_date, flow_end_date)
            ''')

            conn.commit()
            print(f"✓ Database initialized at {self.db_path}")

    def insert_location(self, location_code: str, location_name: str, region_name: str):
        """Insert or update location reference data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO locations (location_code, location_name, region_name)
                VALUES (?, ?, ?)
            ''', (location_code, location_name, region_name))
            conn.commit()

    def insert_price_data(self, records: List[Dict]):
        """Insert price data records, handling duplicates gracefully"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            inserted_count = 0
            duplicate_count = 0

            for record in records:
                try:
                    cursor.execute('''
                        INSERT INTO price_data (
                            point_code, issue_date, trade_date, region_name, location_name,
                            low, high, average, volume, deals, flow_start_date, flow_end_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        record.get('point_code'),
                        record.get('issue_date'),
                        record.get('trade_date'),
                        record.get('region_name'),
                        record.get('location_name'),
                        record.get('low'),
                        record.get('high'),
                        record.get('average'),
                        record.get('volume'),
                        record.get('deals'),
                        record.get('flow_start_date'),
                        record.get('flow_end_date')
                    ))
                    inserted_count += 1
                except sqlite3.IntegrityError:
                    # Record already exists (duplicate)
                    duplicate_count += 1
                    continue

            conn.commit()
            return inserted_count, duplicate_count

    def get_price_data(self, location_code: str = None, start_date: str = None,
                      end_date: str = None, limit: int = None) -> List[Dict]:
        """Retrieve price data with optional filters"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            query = "SELECT * FROM price_data WHERE 1=1"
            params = []

            if location_code:
                query += " AND point_code = ?"
                params.append(location_code)

            if start_date:
                query += " AND trade_date >= ?"
                params.append(start_date)

            if end_date:
                query += " AND trade_date <= ?"
                params.append(end_date)

            query += " ORDER BY trade_date ASC"

            if limit:
                query += " LIMIT ?"
                params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    def get_available_locations(self) -> List[Dict]:
        """Get all available locations from price data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute('''
                SELECT DISTINCT point_code, location_name, region_name
                FROM price_data
                ORDER BY region_name, location_name
            ''')

            return [dict(row) for row in cursor.fetchall()]

    def get_date_range(self, location_code: str = None) -> Dict:
        """Get the date range of available data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            query = "SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date FROM price_data"
            params = []

            if location_code:
                query += " WHERE point_code = ?"
                params.append(location_code)

            cursor.execute(query, params)
            result = cursor.fetchone()

            return {
                'min_date': result[0],
                'max_date': result[1]
            }

    def get_database_stats(self) -> Dict:
        """Get statistics about the database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Total records
            cursor.execute("SELECT COUNT(*) FROM price_data")
            total_records = cursor.fetchone()[0]

            # Unique locations
            cursor.execute("SELECT COUNT(DISTINCT point_code) FROM price_data")
            unique_locations = cursor.fetchone()[0]

            # Date range
            date_range = self.get_date_range()

            return {
                'total_records': total_records,
                'unique_locations': unique_locations,
                'date_range': date_range
            }

def create_database():
    """Utility function to create a new database"""
    db = PriceDatabase()
    print("Database created successfully!")
    return db

if __name__ == "__main__":
    # Test database creation
    db = create_database()
    stats = db.get_database_stats()
    print(f"Database stats: {stats}")