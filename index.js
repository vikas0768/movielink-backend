const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

// Firebase service account key load karo
const serviceAccount = require("./serviceAccountKey.json");

// Firebase initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Zeydoo callback endpoint
app.get("/zeydoo-callback", async (req, res) => {
  try {
    const { subid, payout, txid, offer_id } = req.query;

    if (!subid) {
      return res.status(400).send("❌ Missing subid");
    }

    // Firestore me user ko search karo
    const userRef = db.collection("users").doc(subid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send("❌ User not found in Firestore");
    }

    // Offer coins update karo
    await userRef.update({
      offerCoins: admin.firestore.FieldValue.increment(parseFloat(payout)),
    });

    console.log(`Offer completed: ${subid} +${payout} coins`);
    return res.status(200).send("✅ Success");
  } catch (error) {
    console.error("Error processing callback:", error);
    return res.status(500).send("❌ Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});