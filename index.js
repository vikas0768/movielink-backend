const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const serviceAccount = require("./serviceAccountKey.json");

// Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root check
app.get("/", (req, res) => {
  res.send("Movielink backend running successfully!");
});

// ✅ Zeydoo Callback Endpoint
app.get("/zeydoo-callback", async (req, res) => {
  try {
    // Zeydoo se aane wale params
    const { var: userUid, ymid: clickId, payout, status } = req.query;

    if (!userUid || !clickId) {
      return res.status(400).send("❌ Missing userUid or clickId");
    }

    console.log("Zeydoo Callback Received:", req.query);

    // Firestore me user document find karo
    const userRef = db.collection("users").doc(userUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).send("❌ User not found in Firestore");
    }

    // Offer history document update
    const offerRef = userRef.collection("offer_history").doc(clickId);

    if (status === "approved") {
      // ✅ Offer completed successfully
      await offerRef.update({
        status: "Completed",
        completedAt: Date.now(),
      });

      // Coins user wallet me add karo
      await userRef.update({
        offerCoins: admin.firestore.FieldValue.increment(parseFloat(payout)),
      });

      console.log(`✅ Offer Completed! UID: ${userUid}, Coins: ${payout}`);
      return res.status(200).send("✅ Offer marked as Completed");

    } else if (status === "rejected") {
      // ❌ Offer failed
      await offerRef.update({
        status: "Failed",
        completedAt: Date.now(),
      });

      console.log(`❌ Offer Failed! UID: ${userUid}`);
      return res.status(200).send("❌ Offer marked as Failed");

    } else {
      // Agar status na mile to default Complete
      await offerRef.update({
        status: "Completed",
        completedAt: Date.now(),
      });

      await userRef.update({
        offerCoins: admin.firestore.FieldValue.increment(parseFloat(payout || 0)),
      });

      return res.status(200).send("✅ Default Completed");
    }
  } catch (error) {
    console.error("Error processing callback:", error);
    return res.status(500).send("❌ Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
