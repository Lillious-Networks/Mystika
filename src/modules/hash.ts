import crypto from "crypto";

export function hash(password: string) {
  const [hashedPassword, numberValue, sum] = getHash(password);
  const hash = crypto
    .createHash("sha512")
    .update(`${sum}${hashedPassword}`)
    .digest("hex");
  const middle = Math.ceil(hash.length / 2);
  const prefix = hash.slice(0, middle);
  const suffix = hash.slice(middle);
  const salt = crypto
    .createHash("sha512")
    .update(`${prefix}${numberValue}`)
    .digest("hex");
  const result = `L${salt}A${prefix}P${hashedPassword}Y${suffix}X`;
  return result;
}

export function getHash(password: string) {
  const hash = crypto.createHash("sha512").update(password).digest("hex");
  const numberValue = Object.assign([], Array.from(hash.replace(/[a-z]/g, "")));
  const sum = numberValue.reduce(
    (acc: number, curr: string, i: number) => acc + i,
    0
  );
  return [hash, numberValue, sum];
}

export function randomBytes(size: number) {
  return crypto.randomBytes(size).toString("hex");
}
