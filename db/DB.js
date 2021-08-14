const mysql = require('mysql');
const db_info = {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'catchmind'
};

module.exports = {
    init: () => {
        return mysql.createConnection(db_info);
    },
    connect: conn => {
        conn.connect(err => {
            if (err) console.error('mysql connection error : ' + err);
            else console.log('mysql is connected successfully!');
        });
    }
}