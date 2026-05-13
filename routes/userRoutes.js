const express = require('express');
const router = express.Router();

const db = require('../database/db');

router.get('/', (req, res) => {
    res.render('login');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', (req, res) => {

    console.log(req.body);

    const flat_no = req.body.flat_no;
    const password = req.body.password;

    const sql =
    "SELECT * FROM users WHERE flat_no=? AND password=?";

    db.query(sql,
    [flat_no, password],
    (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        if (result.length > 0) {

            req.session.user = flat_no;

            res.redirect('/payment');

        } else {

            res.send('Invalid Login');

        }

    });

});

router.get('/payment', (req, res) => {

    res.render('payment', {
        flat_no: req.session.user
    });

});

module.exports = router;