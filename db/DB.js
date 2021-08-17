const mysql = require('mysql');
const db_info = {
    host: 'www.yydhsoft.com',
    port: '3306',
    user: 'skills01',
    password: '1234',
    database: 'skills01'
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