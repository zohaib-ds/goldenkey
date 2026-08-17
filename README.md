# Betterhomes Real Estate + Private Admin

Public pages:
- /
- /buy
- /rent
- /services
- /insights
- /guides
- /about

Private listing admin:
- /admin

Admin supports:
- Buy/Rent toggle
- Manual listing creation
- CSV upload
- Generated CSV sample layout download
- Listing table
- Delete
- Publish/draft
- LocalStorage data contract (ready to replace with Supabase)

CSV columns are defined in one place and reused by both the sample generator and importer:
title,purpose,location,price,propertyType,bedrooms,area,image,status

Run:
npm install
npm run dev
