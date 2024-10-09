import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();

// Enable CORS for all routes
app.use(cors());

// Increase payload size limit to handle large requests (like PDF data)
app.use(express.json({ limit: '10mb' })); // Adjust the limit as needed
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Root route - GET request to '/'
app.get('/', (req, res) => {
    res.send('Welcome to the proxy server! Use POST /send-email to send emails.');
});

app.post('/send-email', async (req, res) => {
    const { email, totalAmount, pdfData, orderItems } = req.body;

    // Log the received data for debugging
    console.log('Received data:', { email, totalAmount, pdfData, orderItems });

    try {
        const orderSummaryHTML = `
            <table class="table" style="width: 100%;">
                <thead style="background-color: #FFAA33;">
                    <tr>
                        <th>Attraction</th>
                        <th>Ticket Type</th>
                        <th>Quantity</th>
                        <th>Price per Ticket</th>
                        <th>Date of Visit</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderItems.map(item => `
                        <tr>
                            <td>${item.attractionName}</td>
                            <td>${item.ticketType}</td>
                            <td>${item.quantity}</td>
                            <td>RM ${item.price.toFixed(2)}</td>
                            <td>${item.visitDate}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer MY API Key`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [
                    {
                        to: [{ email: email }],
                        subject: 'Order Summary and Ticket',
                    }
                ],
                from: { email: 'flyonetravelexplorer@gmail.com' },
                content: [
                    {
                        type: 'text/html',
                        value: `
                            <h2>Thank you for your order!</h2>
                            <p>Your total amount is RM ${totalAmount.toFixed(2)}.</p>
                            <h3>Order Summary:</h3>
                            ${orderSummaryHTML}
                        `,
                    }
                ],
                attachments: [
                    {
                        content: pdfData,  // Ensure this is only the base64 part
                        type: 'application/pdf',
                        filename: 'Tickets.pdf',
                        disposition: 'attachment',
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorDetails = await response.text(); // Get the error details from response
            throw new Error(`Error sending email: ${response.statusText}, Details: ${errorDetails}`);
        }

        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error in sending email:', error); // Log the error for debugging
        res.status(500).json({ message: `Failed to send email: ${error.message}` });
    }
});

app.listen(3000, () => {
    console.log('Proxy server running on http://localhost:3000');
});
