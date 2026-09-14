#!/usr/bin/env bash
# Make a LAN CA + server cert on the Mac. Copy certificates/ onto the NAS.
# AirDrop caddy-root.crt (the CA) to the iPad.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/certificates"
mkdir -p "$OUT"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <nas-ip> [extra-name-or-ip...]" >&2
  echo "Example: $0 192.168.86.55" >&2
  exit 1
fi

is_ip() {
  [[ "$1" =~ ^[0-9]+(\.[0-9]+){3}$ ]]
}

ALT_NAMES=""
ip_i=1
dns_i=1
for name in "$@"; do
  if is_ip "$name"; then
    ALT_NAMES+="IP.${ip_i} = ${name}"$'\n'
    ip_i=$((ip_i + 1))
  else
    ALT_NAMES+="DNS.${dns_i} = ${name}"$'\n'
    dns_i=$((dns_i + 1))
  fi
done

CA_CFG="$(mktemp)"
SERVER_CFG="$(mktemp)"
trap 'rm -f "$CA_CFG" "$SERVER_CFG" "$OUT/server.csr" "$OUT/root.srl"' EXIT

cat > "$CA_CFG" <<'EOF'
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no
[dn]
CN = Visual Vinyl Scrobbler LAN CA
[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF

cat > "$SERVER_CFG" <<EOF
[req]
distinguished_name = dn
prompt = no
[dn]
CN = $1
[v3_server]
basicConstraints = CA:FALSE
keyUsage = digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
${ALT_NAMES}
EOF

if [[ ! -f "$OUT/root.key" || ! -f "$OUT/root.crt" ]]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$OUT/root.key" \
    -out "$OUT/root.crt" \
    -config "$CA_CFG"
  echo "Created CA: $OUT/root.crt"
else
  echo "Reusing existing CA: $OUT/root.crt"
fi

openssl req -newkey rsa:2048 -nodes \
  -keyout "$OUT/server.key" \
  -out "$OUT/server.csr" \
  -config "$SERVER_CFG"

openssl x509 -req -in "$OUT/server.csr" \
  -CA "$OUT/root.crt" -CAkey "$OUT/root.key" -CAcreateserial \
  -out "$OUT/server.crt" -days 825 -sha256 \
  -extfile "$SERVER_CFG" -extensions v3_server

cp "$OUT/root.crt" "$ROOT/caddy-root.crt"

echo
openssl x509 -in "$OUT/server.crt" -noout -ext subjectAltName
echo
echo "AirDrop this to the iPad:"
echo "  $ROOT/caddy-root.crt"
echo "Copy the whole certificates/ folder onto the NAS project, then restart Caddy."
