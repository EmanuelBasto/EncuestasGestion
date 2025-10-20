import { pool } from './src/db.js';

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas existentes...');
    
    // Verificar si existe la tabla tokens_reset
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tokens_reset'
      );
    `);
    
    const tokensResetExists = result.rows[0].exists;
    console.log('Tabla tokens_reset existe:', tokensResetExists);
    
    if (!tokensResetExists) {
      console.log('🔄 Creando tabla tokens_reset...');
      await pool.query(`
        CREATE TABLE tokens_reset (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expiracion TIMESTAMPTZ NOT NULL,
          usado BOOLEAN NOT NULL DEFAULT FALSE,
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_tokens_reset_hash ON tokens_reset(token_hash);
        CREATE INDEX ix_tokens_reset_user ON tokens_reset(user_id);
      `);
      console.log('✅ Tabla tokens_reset creada exitosamente');
    }
    
    // Listar todas las tablas
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📊 Tablas en la base de datos:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();

