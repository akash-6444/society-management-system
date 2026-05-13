const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'society_management'
});

connection.connect((err) => {
    if (err) {
        console.log('Database Connection Failed');
    } else {
        console.log('MySQL Connected');
    }
});

module.exports = connection;