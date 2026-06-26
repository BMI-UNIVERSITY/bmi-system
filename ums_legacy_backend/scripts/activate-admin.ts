import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';

dotenv.config();

const PB_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@bmi.edu';
const ADMIN_PASS = (process.env.POCKETBASE_ADMIN_PASSWORD ?? '');

async function activateAdmin() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log('Logging in as admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

        console.log('Searching for user by email...');
        let user;
        try {
            user = await pb.collection('users').getFirstListItem(`email="${ADMIN_EMAIL}"`);
            console.log(`Found user: ${user.id}. Status: ${user.isActive}`);
            
            await pb.collection('users').update(user.id, {
                isActive: true,
                role: 'admin'
            });
            console.log('✅ Account activated successfully!');
        } catch (e) {
            console.log('User not found in "users" collection. Creating...');
            await pb.collection('users').create({
                email: ADMIN_EMAIL,
                password: ADMIN_PASS,
                passwordConfirm: ADMIN_PASS,
                role: 'admin',
                isActive: true,
                name: 'System Admin'
            });
            console.log('✅ Admin user created and activated!');
        }

    } catch (error: any) {
        console.error('❌ Error activating admin:', error.message);
        if (error.data) console.error(JSON.stringify(error.data, null, 2));
    }
}

activateAdmin();
