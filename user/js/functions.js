const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const { jsPDF } = require("jspdf");
const QRCode = require("qrcode");

// Initialize Firebase admin
admin.initializeApp();

// Set SendGrid API Key
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendOrderConfirmationEmail = functions.firestore
    .document("orders/{orderId}")
    .onCreate(async (snap, context) => {
        const orderData = snap.data();
        const userId = orderData.userId;

        // Fetch user data
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        const userData = userDoc.data();
        const userEmail = userData.email;

        // Generate PDF with jsPDF
        const doc = new jsPDF();
        doc.text("Thank you for your purchase!", 20, 20);
        doc.text(`Order ID: ${context.params.orderId}`, 20, 30);

        // Generate QR code for the ticket
        const qrCodeUrl = await QRCode.toDataURL("Sample Ticket Data");
        doc.addImage(qrCodeUrl, "JPEG", 20, 40, 50, 50);

        // Convert PDF to Base64 for email attachment
        const pdfData = doc.output("datauristring");

        // Send email via SendGrid
        const msg = {
            to: userEmail, // recipient
            from: "flyonetravelexplorer@gmail.com", // sender's email
            subject: "Your Ticket and Order Summary",
            text: "Thank you for your purchase. Please find your ticket and order details attached.",
            attachments: [
                {
                    content: pdfData.split(",")[1], // Base64-encoded PDF data
                    filename: "ticket.pdf",
                    type: "application/pdf",
                    disposition: "attachment",
                },
            ],
        };

        await sgMail.send(msg);
        return null;
    });
