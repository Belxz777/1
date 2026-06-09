# Твой VPS IP, например 195.122.87.1
# Домен автоматически: 195-122-87-1.sslip.io -> резолвится в 195.122.87.1

apt install certbot
certbot certonly --standalone \
  --agree-tos \
  --register-unsafely-without-email \
  -d 195-122-87-1.sslip.io   # <- меняешь на свой IP через дефисы


# /etc/letsencrypt/live/195-122-87-1.sslip.io/fullchain.pem
# /etc/letsencrypt/live/195-122-87-1.sslip.io/privkey.pem12


авторенью echo "0 0 */5 * * certbot renew --quiet" | crontab -12

PUBLIC_HOST=195-122-87-1.sslip.io
TLS_CERT=/etc/letsencrypt/live/195-122-87-1.sslip.io/fullchain.pem
TLS_KEY=/etc/letsencrypt/live/195-122-87-1.sslip.io/privkey.pem


vless://uuid@195-122-87-1.sslip.io:10442?...&sni=195-122-87-1.sslip.io&security=tls#...