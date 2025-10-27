const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'socialmedia_events';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function connectToRabbitMQ(maxRetries = 10, delay = 3000) {
    if (channel) {
        return channel;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries})...`);
            
            connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
            channel = await connection.createChannel();

            await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
            
            logger.info("Successfully connected to RabbitMQ");

            connection.on('error', (err) => {
                logger.error('RabbitMQ connection error:', err);
                channel = null;
                connection = null;
            });

            connection.on('close', () => {
                logger.warn('RabbitMQ connection closed. Reconnecting...');
                channel = null;
                connection = null;
            });

            return channel;
        } catch (error) {
            logger.error(`RabbitMQ connection attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            channel = null;
            connection = null;
            
            if (attempt < maxRetries) {
                logger.info(`Retrying in ${delay / 1000} seconds...`);
                await sleep(delay);
            } else {
                throw new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts: ${error.message}`);
            }
        }
    }
}

async function publishEvent(routingKey, message) {
    try {
        if (!channel) {
            await connectToRabbitMQ();
        }

        const sent = channel.publish(
            EXCHANGE_NAME, 
            routingKey, 
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );

        if (sent) {
            logger.info(`Event published: ${routingKey}`);
        } else {
            logger.warn(`Failed to publish event: ${routingKey} (channel buffer full)`);
        }
    } catch (error) {
        logger.error(`Error publishing event ${routingKey}:`, error);
        channel = null;
        throw error;
    }
}

async function consumeEvent(routingKey, callback) {
    try {
        if (!channel) {
            await connectToRabbitMQ();
        }

        const q = await channel.assertQueue("", { exclusive: true });
        await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
        
        channel.consume(q.queue, (msg) => {
            if (msg !== null) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    callback(content);
                    channel.ack(msg);
                } catch (error) {
                    logger.error(`Error processing message from ${routingKey}:`, error);
                    channel.nack(msg, false, false);
                }
            }
        }, { noAck: false });

        logger.info(`Subscribed to event: ${routingKey}`);
    } catch (error) {
        logger.error(`Error consuming event ${routingKey}:`, error);
        channel = null;
        throw error;
    }
}

async function closeConnection() {
    try {
        if (channel) {
            await channel.close();
        }
        if (connection) {
            await connection.close();
        }
        logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
        logger.error('Error closing RabbitMQ connection:', error);
    } finally {
        channel = null;
        connection = null;
    }
}

process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeConnection();
    process.exit(0);
});

module.exports = {
    connectToRabbitMQ,
    publishEvent,
    consumeEvent,
    closeConnection,
};