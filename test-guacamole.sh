#!/bin/bash

echo "🧪 Testing Guacamole Setup..."
echo ""

# Test 1: Check if Guacamole API is accessible
echo "1️⃣ Testing Guacamole API accessibility..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/guacamole/)
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "304" ]; then
    echo "✅ Guacamole API is accessible"
else
    echo "❌ Guacamole API is NOT accessible (HTTP $RESPONSE)"
fi
echo ""

# Test 2: Check available languages
echo "2️⃣ Testing API endpoints..."
curl -s http://localhost:8080/guacamole/api/languages | jq '.' || echo "❌ Languages endpoint failed"
echo ""

# Test 3: Test authentication
echo "3️⃣ Testing authentication..."
TOKEN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=guacadmin&password=guacadmin" \
  http://localhost:8080/guacamole/api/tokens)

AUTH_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.authToken')

if [ "$AUTH_TOKEN" != "null" ] && [ -n "$AUTH_TOKEN" ]; then
    echo "✅ Authentication successful"
    echo "   Token: ${AUTH_TOKEN:0:20}..."
    
    # Test 4: Get connections
    echo ""
    echo "4️⃣ Testing connections endpoint..."
    CONNECTIONS=$(curl -s "http://localhost:8080/guacamole/api/session/data/mysql/connections?token=$AUTH_TOKEN")
    echo "$CONNECTIONS" | jq '.'
    
    CONNECTION_COUNT=$(echo "$CONNECTIONS" | jq 'length')
    if [ "$CONNECTION_COUNT" -gt 0 ]; then
        echo "✅ Found $CONNECTION_COUNT connection(s)"
    else
        echo "⚠️  No connections found"
    fi
else
    echo "❌ Authentication failed"
    echo "   Response: $TOKEN_RESPONSE"
fi

echo ""
echo "5️⃣ Checking Docker containers..."
docker-compose ps

echo ""
echo "6️⃣ Checking VNC container..."
VNC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6901)
if [ "$VNC_RESPONSE" = "200" ]; then
    echo "✅ VNC noVNC interface is accessible"
else
    echo "❌ VNC noVNC interface is NOT accessible"
fi

echo ""
echo "✅ Testing complete!"
