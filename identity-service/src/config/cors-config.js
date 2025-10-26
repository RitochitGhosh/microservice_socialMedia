const cors = require("cors");

const configureCors = () => {
    return cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000', // local dev
                'https://production-domain.com' // production domain
            ]

            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } 
            else {
                callback(new Error("Not allowed by cors"))
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
        preflightContinue: false,
        maxAge: 600,
        optionsSuccessStatus: 204
    })
}

module.exports = { configureCors }