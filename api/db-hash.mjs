import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const w = await mongoose.connection.db.collection("webmasters").findOne({});
console.log("full hash:", w.password, "| length:", w.password.length);
console.log("isValidBcryptHash:", bcrypt.getRounds(w.password) > 0);
for (const p of ["admin","webmaster","tamil3","123456","password","Admin@123","webmaster123"]) {
  if (bcrypt.compareSync(p, w.password)) console.log("MATCH for password:", p);
}
console.log("done");
await mongoose.disconnect();
