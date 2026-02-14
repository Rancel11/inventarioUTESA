import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
   port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '809523',
  database: process.env.DB_NAME || 'inventario_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log('Conexión a MySQL establecida correctamente');
    connection.release();
  })
  .catch(err => {
    console.error('Error al conectar con MySQL:', err.message);
  });

export default pool;