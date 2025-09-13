
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const path = require("path");

// ✅ Firebase service account key load karo
const serviceAccount = require("./serviceAccountKey.json");

// ✅ Firebase initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Root Route (to check if backend is live)
app.get("/", (req, res) => {
  res.send("🚀 MovieLink Backend is running successfully!");
});

// ✅ Zeydoo Callback Endpoint
app.get("/zeydoo-callback", async (req, res) => {
  try {
    const { subid, payout, txid, offer_id } = req.query;

    // Check if required data is present
    if (!subid || !payout) {
      return res.status(400).send("❌ Missing required parameters (subid or payout)");
    }

    console.log(`Received Callback: SUBID=${subid}, PAYOUT=${payout}, TXID=${txid}, OFFER_ID=${offer_id}`);

    // Firestore me user ko search karo
    const userRef = db.collection("users").doc(subid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`User with ID ${subid} not found in Firestore`);
      return res.status(404).send("❌ User not found in Firestore");
    }

    // ✅ Offer coins ko update karo
    await userRef.update({
      offerCoins: admin.firestore.FieldValue.increment(parseFloat(payout)),
    });

    console.log(`✅ Offer completed for User: ${subid} | Coins Added: ${payout}`);
    return res.status(200).send("✅ Success");
  } catch (error) {
    console.error("❌ Error processing callback:", error);
    return res.status(500).send("❌ Internal Server Error");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
