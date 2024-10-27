import crypto from "crypto";
const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const encryptionKey = new Uint8Array(Buffer.from(key, 'hex'));

export default function decryptWithoutIV(data: string) {
    const decipher = crypto.createDecipheriv('aes-256-ecb', encryptionKey, null) as any;
    let decrypted = decipher.update(Buffer.from(data, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}