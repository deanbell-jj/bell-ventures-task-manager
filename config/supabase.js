/**
 * Supabase Configuration & Client
 * Connects Node.js backend to your Supabase PostgreSQL database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase wrapper with error handling
 */
const db = {
  /**
   * Query helper
   */
  async query(table, options = {}) {
    try {
      let query = supabase.from(table);

      if (options.select) {
        query = query.select(options.select);
      }

      if (options.filter) {
        query = query[options.filter.operator || 'eq'](
          options.filter.column,
          options.filter.value
        );
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending !== false
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ Database query error (${table}):`, error);
      throw error;
    }
  },

  /**
   * Insert row
   */
  async insert(table, row) {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert([row])
        .select();

      if (error) throw error;
      return data ? data[0] : null;
    } catch (error) {
      console.error(`❌ Insert error (${table}):`, error);
      throw error;
    }
  },

  /**
   * Update row
   */
  async update(table, id, updates) {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data ? data[0] : null;
    } catch (error) {
      console.error(`❌ Update error (${table}):`, error);
      throw error;
    }
  },

  /**
   * Delete row
   */
  async delete(table, id) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`❌ Delete error (${table}):`, error);
      throw error;
    }
  },

  /**
   * Get single row
   */
  async getOne(table, column, value) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select()
        .eq(column, value)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error(`❌ GetOne error (${table}):`, error);
      throw error;
    }
  },

  /**
   * Get all rows
   */
  async getAll(table, filter = {}) {
    try {
      let query = supabase.from(table).select();

      for (const [column, value] of Object.entries(filter)) {
        query = query.eq(column, value);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`❌ GetAll error (${table}):`, error);
      throw error;
    }
  }
};

module.exports = {
  supabase,
  db
};
