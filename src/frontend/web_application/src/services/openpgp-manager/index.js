import openpgp, * as module from 'openpgp';

const GENERATE_KEY_OPTIONS = {
  numBits: 4096,
};

export const ERROR_UNABLE_READ_PUBLIC_KEY = 'unable-read-public-key'; // __('openpgp.feedback.unable-read-public-key')
export const ERROR_UNABLE_READ_PRIVATE_KEY = 'unable-read-private-key'; // __('openpgp.feedback.unable-read-private-key')
export const ERROR_FINGERPRINTS_NOT_MATCH = 'fingerprints-not-match'; // __('openpgp.feedback.fingerprints-not-match')

// http://monsur.hossa.in/2012/07/20/utf-8-in-javascript.html
function encodeUTF8(str) {
  return unescape(encodeURIComponent(str));
}

// function decodeUTF8(str) {
//   return decodeURIComponent(escape(str));
// }

export function generateKey(name, email, passphrase, options = {}) {
  return openpgp.generateKey({
    ...GENERATE_KEY_OPTIONS,
    ...options,
    userIds: [{ name: encodeUTF8(name), email }],
    passphrase,
  });
}

export function getKeyFromASCII(armored) {
  const keys = module.key.readArmored(armored).keys;

  if (keys && keys.length) {
    return keys[0];
  }

  return undefined;
}

export function encrypt({ content, recipientPubKeys }, key) {
  const options = {
    data: content,
    publicKeys: recipientPubKeys.reduce(
      (prev, pubkey) => [...prev, ...module.key.readArmored(pubkey).keys],
      []
    ),
    privateKeys: [key],
  };

  return openpgp.encrypt(options);
}

export function decrypt({ content, authorPubKeys = [] }, key) {
  const options = {
    message: openpgp.message.readArmored(content),
    publicKeys: authorPubKeys.reduce(
      (prev, pubkey) => [...prev, ...module.key.readArmored(pubkey).keys],
      []
    ),
    privateKey: key,
  };

  openpgp.decrypt(options);
}

export function validatePublicKeyChain(__, publicKeyArmored) {
  return new Promise((resolve, reject) => {
    const publicKey = getKeyFromASCII(publicKeyArmored);

    if (!publicKey) {
      return reject(ERROR_UNABLE_READ_PUBLIC_KEY);
    }

    return resolve({ key: publicKey, publicKeyArmored });
  });
}

export function validateKeyChainPair(publicKeyArmored, privateKeyArmored) {
  return new Promise((resolve, reject) => {
    const publicKey = getKeyFromASCII(publicKeyArmored);
    const privateKey = getKeyFromASCII(privateKeyArmored);

    const errors = [];

    if (!publicKey) {
      errors.push(ERROR_UNABLE_READ_PUBLIC_KEY);
    }

    if (!privateKey) {
      errors.push(ERROR_UNABLE_READ_PRIVATE_KEY);
    }

    if (publicKey && privateKey &&
      publicKey.primaryKey.fingerprint !== privateKey.primaryKey.fingerprint
    ) {
      errors.push(ERROR_FINGERPRINTS_NOT_MATCH);
    }

    if (errors.length) {
      return reject(errors);
    }

    return resolve({ key: publicKey, publicKeyArmored, privateKeyArmored });
  });
}
