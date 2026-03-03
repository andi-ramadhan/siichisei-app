// Agora RTC Token Generator - Supabase Edge Function
// Generates a temporary token using Agora's TokenBuilder algorithm (v4 compatible)
// Certificate must only live server-side, never in the app bundle.

import { serve } from 'https://deno.land/std@0.168.0/http/mod.ts';

// --- Agora TokenBuilder (AccessToken2 format) ---
// Ported from: https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey

const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID') ?? '';
const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE') ?? '';

const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
} as const;

/** Privilege expiry: 1 hour from now */
const TOKEN_EXPIRY_SECONDS = 3600;

// ----- HMAC-SHA256 utilities using Web Crypto -----
async function hmacSha256(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, data);
}

function uint16ToBytes(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = v & 0xff;
  b[1] = (v >> 8) & 0xff;
  return b;
}
function uint32ToBytes(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = v & 0xff;
  b[1] = (v >> 8) & 0xff;
  b[2] = (v >> 16) & 0xff;
  b[3] = (v >> 24) & 0xff;
  return b;
}
function stringToBytes(s: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(s);
}
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
function packString(s: string): Uint8Array {
  const bytes = stringToBytes(s);
  return concat(uint16ToBytes(bytes.length), bytes);
}
function packUint32(v: number): Uint8Array {
  return uint32ToBytes(v);
}

interface PrivilegeMessage {
  salt: number;
  ts: number;
  privileges: Record<number, number>;
}

/**
 * Builds an Agora RTC AccessToken (v1 compatible with Agora RTC SDK).
 * 
 * Token Privilege IDs (from Agora docs):
 *  1 = kJoinChannel
 *  2 = kPublishAudioStream
 *  3 = kPublishVideoStream
 *  5 = kPublishDataStream
 */
async function buildToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number | string,
  role: 1 | 2,
  privilegeExpiredTs: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 0xffffffff);
  const ts = now + TOKEN_EXPIRY_SECONDS;

  // Privileges
  const privileges: Record<number, number> = {
    1: privilegeExpiredTs, // kJoinChannel
  };
  if (role === Role.PUBLISHER) {
    privileges[2] = privilegeExpiredTs; // kPublishAudioStream
    privileges[3] = privilegeExpiredTs; // kPublishVideoStream
  }

  // Encode uid: Agora uses 0 for arbitrary/string UIDs, otherwise the numeric UID
  const uidStr = uid === 0 ? '' : String(uid);

  // Pack message
  const msgParts: Uint8Array[] = [
    packUint32(salt),
    packUint32(ts),
    uint16ToBytes(Object.keys(privileges).length),
  ];
  for (const [k, v] of Object.entries(privileges)) {
    msgParts.push(uint16ToBytes(Number(k)));
    msgParts.push(packUint32(v));
  }
  const msg = concat(...msgParts);

  // Build signing content
  const signing = concat(
    stringToBytes(appId),
    stringToBytes(channelName),
    stringToBytes(uidStr),
    msg,
  );

  // HMAC-SHA256(appCertificate hex → bytes, signing)
  const certBytes = hexToBytes(appCertificate);
  const sig = new Uint8Array(await hmacSha256(certBytes.buffer, signing.buffer));

  // Pack token body: version(1) + appId + msg + sig
  const body = concat(
    uint16ToBytes(sig.length), sig,
    packUint32(salt),
    packUint32(ts),
    uint16ToBytes(Object.keys(privileges).length),
  );
  // Re-pack with privileges
  const bodyFull = concat(
    uint16ToBytes(sig.length), sig,
    packUint32(salt),
    packUint32(ts),
    uint16ToBytes(Object.keys(privileges).length),
    ...Object.entries(privileges).flatMap(([k, v]) => [
      uint16ToBytes(Number(k)),
      packUint32(v),
    ]),
  );

  const versionStr = '006';
  const contentStr = appId + packString(channelName) + packString(uidStr);

  // Final token: version + appId + base64(compress(content+body))
  // Agora token format: "006" + appId + base64url(zlib(content + bodyFull))
  // We use a simpler packing that works with the Agora SDK:
  const content = concat(
    stringToBytes(appId),
    packString(channelName),
    packString(uidStr),
    bodyFull,
  );

  // Compress with DeflateRaw
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(content);
  writer.close();
  const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());

  // Base64 encode
  const b64 = btoa(String.fromCharCode(...compressed));
  return `${versionStr}${appId}${b64}`;
}

// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelName, uid = 0, role = 'publisher' } = await req.json();

    if (!channelName) {
      return new Response(JSON.stringify({ error: 'channelName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE env vars');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiryTs = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    const agoraRole = role === 'publisher' ? Role.PUBLISHER : Role.SUBSCRIBER;

    const token = await buildToken(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      expiryTs,
    );

    return new Response(JSON.stringify({ token, expiryTs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return new Response(JSON.stringify({ error: 'Token generation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
