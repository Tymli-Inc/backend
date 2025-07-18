import sql from "../database/db.js";
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function syncExistingSubscribers() {
    try {
        console.log('🔄 Starting sync of existing newsletter subscribers to Resend...');
        
        // Get all existing newsletter subscribers from your database
        const subscribers = await sql`SELECT email FROM newsletter`;
        
        console.log(`📧 Found ${subscribers.length} existing subscribers in database`);
        
        if (subscribers.length === 0) {
            console.log('ℹ️  No subscribers to sync');
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Add each subscriber to Resend audience
        for (const subscriber of subscribers) {
            try {
                await resend.contacts.create({
                    email: subscriber.email,
                    audienceId: process.env.RESEND_AUDIENCE_ID,
                });
                console.log(`✅ Added ${subscriber.email} to Resend audience`);
                successCount++;
            } catch (error) {
                // Check if it's a duplicate contact error (contact already exists)
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`ℹ️  ${subscriber.email} already exists in Resend audience`);
                    successCount++;
                } else {
                    console.log(`❌ Failed to add ${subscriber.email}:`, error.message);
                    errorCount++;
                }
            }
            
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('\\n📊 Sync Summary:');
        console.log(`✅ Successfully processed: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📧 Total subscribers: ${subscribers.length}`);
        console.log('\\n🎉 Sync completed!');
        
    } catch (error) {
        console.error('💥 Sync failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the sync
syncExistingSubscribers();
