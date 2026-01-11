test-inbox:
	API_BASE=http://localhost:3000 DATABASE_URL=postgresql://founderos:changeme123@localhost:5432/founderos npm run test:inbox
