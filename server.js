require('dotenv').config();
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// DATABASE CONNECTION
const db = mysql.createConnection({

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT

});

db.connect((err) => {

    if (err) {
        console.log(err);
    } else {
        console.log('MySQL Connected');
    }

});

// EMAIL TRANSPORTER
const transporter = nodemailer.createTransport({

    service: 'gmail',
    auth: {

    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS

}


});

// LOGIN PAGE
app.get('/', (req, res) => {

    res.render('login');

});


// LOGIN CHECK
app.post('/login', (req, res) => {

    const flat_no = req.body.flat_no;
    const password = req.body.password;

    const sql =
    'SELECT * FROM users WHERE flat_no=? AND password=?';

    db.query(sql,
    [flat_no, password],
    (err, result) => {

        if (err) throw err;

        if (result.length > 0) {

            req.session.user = flat_no;

            res.redirect('/payment');

        } else {

            res.send('Invalid Login');

        }

    });

});


// PAYMENT PAGE
app.get('/payment', (req, res) => {

    if (!req.session.user) {

        return res.redirect('/');

    }

    res.render('payment', {

        flat_no: req.session.user

    });

});

app.get('/', (req, res) => {
    res.render('login');
});

app.listen(3000, () => {

    console.log('Server Running On Port 3000');

});

// SAVE PAYMENT
app.post('/pay', (req, res) => {

    const flat_no = req.body.flat_no;
    const email = req.body.email;
    const amount = req.body.amount;
    const month = req.body.month;

    const sql =
    `INSERT INTO payments
    (flat_no, email, amount, month, status)
    VALUES (?, ?, ?, ?, ?)`;

    db.query(sql,
    [flat_no, email, amount, month, 'Paid'],
    (err, result) => {

        if (err) throw err;

        res.render('success');

    });

});

// ADMIN LOGIN PAGE
app.get('/admin-login', (req, res) => {

    res.render('admin-login');

});

// ADMIN LOGIN CHECK
app.post('/admin-login', (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    const sql =
    'SELECT * FROM admin WHERE username=? AND password=?';

    db.query(sql,
    [username, password],
    (err, result) => {

        if (err) throw err;

        if (result.length > 0) {

            req.session.admin = username;

            res.redirect('/admin');

        } else {

            res.send('Invalid Admin Login');

        }

    });

});

// ADMIN DASHBOARD
app.get('/admin', (req, res) => {

    if (!req.session.admin) {

        return res.redirect('/admin-login');

    }

    const sql =
    'SELECT * FROM payments';

    db.query(sql, (err, result) => {

        if (err) throw err;

        res.render('admin-dashboard', {

            payments: result

        });

    });

});

// GENERATE RECEIPT + SEND EMAIL
app.get('/receipt/:id', (req, res) => {

    const paymentId = req.params.id;

    const sql =
    'SELECT * FROM payments WHERE id=?';

    db.query(sql,
    [paymentId],
    (err, result) => {

        if (err) throw err;

        const payment = result[0];

        const doc = new PDFDocument();

        const fileName =
        `receipt_${payment.id}.pdf`;

        const filePath =
        path.join(__dirname, fileName);

        const stream =
        fs.createWriteStream(filePath);

        doc.pipe(stream);

        doc.fontSize(22)
           .text('Maintenance Receipt', {
               align: 'center'
           });

        doc.moveDown();

        doc.fontSize(14)
           .text(`Receipt ID: ${payment.id}`);

        doc.text(`Flat Number: ${payment.flat_no}`);

        doc.text(`Email: ${payment.email}`);

        doc.text(`Amount Paid: ₹ ${payment.amount}`);

        doc.text(`Month: ${payment.month}`);

        doc.text(`Status: ${payment.status}`);

        doc.text(`Payment Date: ${payment.payment_date}`);

        doc.moveDown();

        doc.text('Thank You!', {
            align: 'center'
        });

        doc.end();

        stream.on('finish', () => {

            const mailOptions = {

                from: 'YOUR_GMAIL@gmail.com',

                to: payment.email,

                subject:
                'Maintenance Payment Receipt',

                text:
                'Your maintenance payment receipt is attached.',

                attachments: [

                    {
                        filename: fileName,
                        path: filePath
                    }

                ]

            };

            transporter.sendMail(
            mailOptions,
            (error, info) => {

                if (error) {

                    console.log(error);

                    res.send('Email Failed');

                } else {

                    console.log('Email Sent');

                    res.download(filePath);

                }

            });

        });

    });

});