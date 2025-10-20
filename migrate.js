import { pool } from './src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Ejecutando migración de base de datos...');
    
    // Leer el archivo init.sql
    const sqlFile = path.join(__dirname, 'init.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Ejecutar el SQL
    await pool.query(sqlContent);
    
    console.log('✅ Migración completada exitosamente');
    console.log('📊 Tablas creadas:');
    console.log('  - usuarios');
    console.log('  - tokens_reset');
    console.log('  - encuestas');
    console.log('  - preguntas');
    console.log('  - respuestas');
    console.log('  - respuestas_detalle');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Las tablas ya existen, continuando...');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();

