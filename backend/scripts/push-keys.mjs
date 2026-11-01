/** One-off key generation without running a server; keep the private key only in backend settings. */
import webpush from 'web-push';
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`WEB_PUSH_PUBLIC_KEY=${publicKey}\nWEB_PUSH_PRIVATE_KEY=${privateKey}\nVITE_WEB_PUSH_PUBLIC_KEY=${publicKey}`);
