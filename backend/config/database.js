const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'db.json');

// JSON Database wrapper to match MySQL promise API
class JSONDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = this.loadData();
    this.nextIds = this.calculateNextIds();
  }

  loadData() {
    try {
      const rawData = fs.readFileSync(this.dbPath, 'utf8');
      return JSON.parse(rawData);
    } catch (err) {
      console.error('Error loading JSON database:', err.message);
      return {};
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving JSON database:', err.message);
    }
  }

  calculateNextIds() {
    const ids = {};
    for (const table in this.data) {
      if (Array.isArray(this.data[table]) && this.data[table].length > 0) {
        ids[table] = Math.max(...this.data[table].map(row => row.id || 0)) + 1;
      } else {
        ids[table] = 1;
      }
    }
    return ids;
  }

  getNextId(table) {
    return this.nextIds[table] || 1;
  }

  incrementNextId(table) {
    this.nextIds[table] = (this.nextIds[table] || 1) + 1;
  }

  async query(sql, params = []) {
    try {
      // Parse SQL to determine operation
      const sqlUpper = sql.toUpperCase().trim();
      const isSelect = sqlUpper.startsWith('SELECT');
      const isInsert = sqlUpper.startsWith('INSERT');
      const isUpdate = sqlUpper.startsWith('UPDATE');
      const isDelete = sqlUpper.startsWith('DELETE');

      if (isSelect) {
        return this.handleSelect(sql, params);
      } else if (isInsert) {
        return this.handleInsert(sql, params);
      } else if (isUpdate) {
        return this.handleUpdate(sql, params);
      } else if (isDelete) {
        return this.handleDelete(sql, params);
      }

      return [[], null];
    } catch (error) {
      console.error('JSON Query Error:', error.message);
      console.error('SQL:', sql);
      throw error;
    }
  }

  handleSelect(sql, params) {
    // Extract table name
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    const joinMatch = sql.match(/JOIN\s+(\w+)/gi);
    const mainTable = fromMatch ? fromMatch[1] : null;

    if (!mainTable || !this.data[mainTable]) {
      // Return empty result with count 0 for COUNT queries
      if (sql.toUpperCase().includes('COUNT(*)')) {
        return [[{ count: 0, total_orders: 0, total_revenue: 0, pending_orders: 0, received_orders: 0, preparing_orders: 0, ready_orders: 0, completed_orders: 0, cancelled_orders: 0 }], null];
      }
      return [[], null];
    }

    let results = JSON.parse(JSON.stringify(this.data[mainTable])); // Deep clone

    // Simple WHERE clause parser
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|GROUP|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      results = results.filter(row => this.evaluateWhere(row, whereClause, params));
    }

    // Handle aggregate functions (COUNT, SUM, etc.)
    if (sql.toUpperCase().includes('COUNT(*)') || sql.toUpperCase().includes('SUM(')) {
      return this.handleAggregate(sql, results);
    }

    // Handle JOINs
    if (sql.includes('LEFT JOIN') || sql.includes('JOIN')) {
      results = this.handleJoins(results, sql, mainTable, params);
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(.+?)(?:LIMIT|$)/i);
    if (orderMatch) {
      const orderClause = orderMatch[1].trim();
      const parts = orderClause.split(/\s+/);
      const field = parts[0];
      const direction = parts[1] || 'ASC';
      const fieldName = field.includes('.') ? field.split('.').pop() : field;
      const dir = direction.toUpperCase() === 'ASC' ? 1 : -1;
      results.sort((a, b) => {
        const aVal = a[fieldName];
        const bVal = b[fieldName];
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      results = results.slice(0, limit);
    }

    return [results, null];
  }

  evaluateWhere(row, whereClause, params) {
    let clause = whereClause;
    let paramIndex = 0;

    // Replace ? with actual values
    clause = clause.replace(/\?/g, () => {
      const param = params[paramIndex++];
      if (typeof param === 'string') return `'${param}'`;
      return param;
    });

    // Simple evaluation for common operators
    const conditions = clause.split(/\s+AND\s+/i);
    return conditions.every(condition => {
      // Handle IN clause first (before = check)
      if (condition.toUpperCase().includes(' IN ') || condition.toUpperCase().includes(' IN(')) {
        let [field, values] = condition.split(/\s+IN\s*/i).map(s => s.trim());
        // Remove table alias
        field = field.includes('.') ? field.split('.').pop() : field;
        const valueArray = values.replace(/[()]/g, '').split(',').map(v => v.trim().replace(/'/g, ''));
        return valueArray.includes(String(row[field]));
      }
      if (condition.includes('!=')) {
        let [field, value] = condition.split('!=').map(s => s.trim());
        // Remove table alias
        field = field.includes('.') ? field.split('.').pop() : field;
        const cleanValue = value.replace(/'/g, '');
        return String(row[field]) !== cleanValue;
      }
      if (condition.includes('=')) {
        let [field, value] = condition.split('=').map(s => s.trim());
        // Remove table alias (e.g., u.email -> email)
        field = field.includes('.') ? field.split('.').pop() : field;
        let cleanValue = value.replace(/'/g, '');
        
        // Handle TRUE/FALSE
        if (cleanValue.toUpperCase() === 'TRUE') {
          return row[field] === true || row[field] === 1 || row[field] === '1';
        }
        if (cleanValue.toUpperCase() === 'FALSE') {
          return row[field] === false || row[field] === 0 || row[field] === '0';
        }
        
        return String(row[field]) === cleanValue;
      }
      if (condition.includes('DATE(')) {
        const dateFieldMatch = condition.match(/DATE\((\w+)\)/i);
        if (dateFieldMatch) {
          const field = dateFieldMatch[1];
          const valueMatch = condition.match(/=\s*'([^']+)'/);
          if (valueMatch && row[field]) {
            const rowDate = new Date(row[field]).toISOString().split('T')[0];
            return rowDate === valueMatch[1];
          }
        }
        return false;
      }
      return true;
    });
  }

  handleAggregate(sql, results) {
    const aggregateResult = {};
    
    // Handle COUNT(*)
    if (sql.toUpperCase().includes('COUNT(*)')) {
      // Find alias for COUNT(*) - e.g., COUNT(*) as count or COUNT(*) as total_orders
      const countMatches = sql.matchAll(/COUNT\(\*\)\s+as\s+(\w+)/gi);
      for (const match of countMatches) {
        aggregateResult[match[1]] = results.length;
      }
      // If no alias, use 'count' as default
      if (Object.keys(aggregateResult).length === 0) {
        aggregateResult.count = results.length;
      }
    }
    
    // Handle SUM(field) and SUM(CASE...)
    const sumMatches = sql.matchAll(/SUM\(([^)]+)\)\s+as\s+(\w+)/gi);
    for (const match of sumMatches) {
      const [, expr, alias] = match;
      
      if (expr.toUpperCase().includes('CASE')) {
        // Handle SUM(CASE WHEN status = 'value' THEN 1 ELSE 0 END)
        const caseMatch = expr.match(/WHEN\s+(\w+)\s*=\s*'([^']+)'/i);
        if (caseMatch) {
          const [, field, value] = caseMatch;
          aggregateResult[alias] = results.filter(r => r[field] === value).length;
        } else {
          aggregateResult[alias] = 0;
        }
      } else {
        // Handle SUM(field)
        const fieldName = expr.trim();
        aggregateResult[alias] = results.reduce((sum, r) => sum + (parseFloat(r[fieldName]) || 0), 0);
      }
    }
    
    // Handle COALESCE - just use the SUM result or 0
    const coalesceMatches = sql.matchAll(/COALESCE\(SUM\((\w+)\)[^)]*\)\s+as\s+(\w+)/gi);
    for (const match of coalesceMatches) {
      const [, field, alias] = match;
      if (!(alias in aggregateResult)) {
        aggregateResult[alias] = results.reduce((sum, r) => sum + (parseFloat(r[field]) || 0), 0);
      }
    }
    
    return [[aggregateResult], null];
  }

  handleJoins(results, sql, mainTable, params) {
    // Parse SELECT clause to find aliased fields (e.g., r.id as restaurant_id)
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    const fieldAliases = {};
    if (selectMatch) {
      const selectClause = selectMatch[1];
      const aliasMatches = selectClause.matchAll(/(\w+)\.(\w+)\s+as\s+(\w+)/gi);
      for (const match of aliasMatches) {
        const [, tableAlias, field, alias] = match;
        fieldAliases[`${tableAlias}.${field}`] = alias;
      }
    }

    // Handle simple JOIN scenarios (both LEFT JOIN and INNER JOIN)
    const joinMatches = sql.match(/(?:LEFT\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+([^)]+)/gi) || [];
    
    joinMatches.forEach(joinClause => {
      const match = joinClause.match(/(?:LEFT\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+(.+)/i);
      if (!match) return;

      const [, joinTable, joinAlias, onClause] = match;
      if (!this.data[joinTable]) return;

      const [leftField, rightField] = onClause.split('=').map(s => s.trim());
      const leftCol = leftField.split('.').pop();
      const rightCol = rightField.split('.').pop();

      results = results.map(mainRow => {
        const joinedRow = this.data[joinTable].find(jRow => {
          return String(mainRow[leftCol]) === String(jRow[rightCol]);
        });

        if (joinedRow) {
          // Apply field aliases if defined (e.g., r.id as restaurant_id)
          Object.keys(joinedRow).forEach(key => {
            const fullKey = `${joinAlias}.${key}`;
            if (fieldAliases[fullKey]) {
              mainRow[fieldAliases[fullKey]] = joinedRow[key];
            } else {
              mainRow[key] = joinedRow[key];
            }
          });
        }
        return mainRow;
      });
    });

    return results;
  }

  handleInsert(sql, params) {
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    if (!table || !this.data[table]) {
      return [{ insertId: 0, affectedRows: 0 }, null];
    }

    const fieldsMatch = sql.match(/\((.+?)\)\s+VALUES/i);
    const fields = fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : [];

    const newRecord = { id: this.getNextId(table) };
    fields.forEach((field, idx) => {
      newRecord[field] = params[idx];
    });

    // Add timestamps
    if (!newRecord.created_at) newRecord.created_at = new Date().toISOString();
    if (!newRecord.updated_at) newRecord.updated_at = new Date().toISOString();

    this.data[table].push(newRecord);
    this.incrementNextId(table);
    this.saveData();

    return [{ insertId: newRecord.id, affectedRows: 1 }, null];
  }

  handleUpdate(sql, params) {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    if (!table || !this.data[table]) {
      return [{ affectedRows: 0 }, null];
    }

    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);

    if (!setMatch || !whereMatch) {
      return [{ affectedRows: 0 }, null];
    }

    const updates = setMatch[1].split(',').map(s => s.trim());
    const whereClause = whereMatch[1];

    const updateObj = {};
    const updateParams = [];
    updates.forEach(update => {
      const [field, value] = update.split('=').map(s => s.trim());
      updateObj[field] = null;
    });

    let paramIdx = 0;
    updates.forEach(update => {
      const [field] = update.split('=').map(s => s.trim());
      updateObj[field] = params[paramIdx++];
    });

    let affectedRows = 0;
    this.data[table] = this.data[table].map(row => {
      if (this.evaluateWhere(row, whereClause, params.slice(paramIdx))) {
        Object.assign(row, updateObj, { updated_at: new Date().toISOString() });
        affectedRows++;
      }
      return row;
    });

    this.saveData();
    return [{ affectedRows }, null];
  }

  handleDelete(sql, params) {
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    if (!table || !this.data[table]) {
      return [{ affectedRows: 0 }, null];
    }

    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
    if (!whereMatch) {
      return [{ affectedRows: 0 }, null];
    }

    const whereClause = whereMatch[1];
    const beforeLength = this.data[table].length;

    this.data[table] = this.data[table].filter(row => !this.evaluateWhere(row, whereClause, params));

    const affectedRows = beforeLength - this.data[table].length;
    this.saveData();

    return [{ affectedRows }, null];
  }

  async getConnection() {
    return {
      query: this.query.bind(this),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };
  }
}

let db = null;

async function initDatabase() {
  db = new JSONDatabase(DB_PATH);
  console.log('📄 JSON database initialized');
  console.log(`📁 Database file: ${DB_PATH}`);
  return db;
}

// Initialize on module load
initDatabase();

// Export a proxy that waits for db to be initialized
module.exports = {
  query: async (...args) => {
    if (!db) await initDatabase();
    return db.query(...args);
  },
  getConnection: async () => {
    if (!db) await initDatabase();
    return db.getConnection();
  },
  execute: async (...args) => {
    if (!db) await initDatabase();
    return db.query(...args);
  },
  getType: () => 'json'
};
