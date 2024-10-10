import crypto from "crypto";
const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const encryptionKey = Buffer.from(key, 'hex');

export default function encrypt(data: string) {
    const cipher = crypto.createCipheriv('aes-256-ecb', new Uint8Array(encryptionKey), null) as any;
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
}