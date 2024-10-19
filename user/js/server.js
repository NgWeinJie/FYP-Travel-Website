import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

const app = express();

dotenv.config();

// Enable CORS for all routes
app.use(cors());

// Increase payload size limit to handle large requests (like PDF data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Root route - GET request to '/'
app.get('/', (req, res) => {
    res.send('Welcome to the proxy server! Use POST /send-email to send emails.');
});

app.post('/send-email', async (req, res) => {
    // Destructure the data from the request body
    const { email, name, contactNumber, orderId, orderDate, totalAmount, orderItems, pdfData } = req.body;

    // Log the received data for debugging
    console.log('Received data:', { email, name, contactNumber, orderId, orderDate, totalAmount, orderItems });

    try {
        // Create order summary HTML
        const orderSummaryHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #FFAA33;">
                    <tr>
                        <th style="padding: 8px; color: #FFFFFF; text-align: left; border: 1px solid #ddd;">Attraction</th>
                        <th style="padding: 8px; color: #FFFFFF; text-align: left; border: 1px solid #ddd;">Ticket Type</th>
                        <th style="padding: 8px; color: #FFFFFF; text-align: left; border: 1px solid #ddd;">Quantity</th>
                        <th style="padding: 8px; color: #FFFFFF; text-align: left; border: 1px solid #ddd;">Price per Ticket</th>
                        <th style="padding: 8px; color: #FFFFFF; text-align: left; border: 1px solid #ddd;">Date of Visit</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map(item => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.attractionName}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.ticketType}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">RM ${item.price.toFixed(2)}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${item.visitDate}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Create email HTML with user details and order information
        const emailHTML = `
            <div style="font-family: Arial, sans-serif;">
                <h2 style="color: #500050;">Thank you for your order!</h2>
                <p>Dear ${name},</p>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Date:</strong> ${new Date(orderDate).toLocaleDateString()}</p>
                <h3>User Details:</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Contact Number:</strong> ${contactNumber}</p>
                <h3>Order Summary:</h3>
                ${orderSummaryHTML}
                <p><strong>Total Amount:</strong> RM ${totalAmount.toFixed(2)}</p>
                <p>We appreciate your business!</p>
            </div>
        `;

        // Send email using SendGrid API
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email }] }],
                from: { email: 'flyonetravelexplorer@gmail.com' },
                subject: 'Your Order Summary',
                content: [{ type: 'text/html', value: emailHTML }],
                attachments: [
                    {
                        content: pdfData, // Ensure this is only the base64 part
                        type: 'application/pdf',
                        filename: 'Tickets.pdf',
                        disposition: 'attachment',
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error sending email: ${response.statusText}, Details: ${errorDetails}`);
        }

        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error in sending email:', error);
        res.status(500).json({ message: `Failed to send email: ${error.message}` });
    }
});

app.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
});
