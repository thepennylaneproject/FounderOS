#!/bin/bash
# ~/founderos/scripts/start.sh

echo "🚀 Starting FounderOS..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env with your settings"
    exit 1
fi

# Start services
docker compose up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker compose exec postgres psql -U founderos -d founderos -c "SELECT COUNT(*) FROM organizations;"

if [ $? -ne 0 ]; then
    echo "Database not initialized. Running migration..."
    docker compose exec -T postgres psql -U founderos -d founderos < database/init.sql
    docker compose exec postgres psql -U founderos -d founderos -c "VACUUM ANALYZE;"
fi

echo "✅ FounderOS is running!"
echo "   Web UI: http://localhost"
echo "   API: http://localhost:3000"
echo "   Email: http://localhost:8080"
echo ""
echo "Default login: admin@founderos.local / changeme"