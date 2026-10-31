// Prints a bcrypt hash: npm run hash -- "MyPassword@1"
import bcrypt from 'bcryptjs';
const pw = process.argv[2];
if (!pw) { console.error('Usage: npm run hash -- "password"'); process.exit(1); }
console.log(bcrypt.hashSync(pw, 10));
