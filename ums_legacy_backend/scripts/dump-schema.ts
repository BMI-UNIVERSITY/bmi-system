import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const pb = new PocketBase('http://127.0.0.1:8090');

async function inspect() {
    try {
        await pb.admins.authWithPassword(
            process.env.PB_ADMIN_EMAIL || 'admin@bmi.edu',
            process.env.PB_ADMIN_PASSWORD || 'BMIAdmin2024Secure'
        );

        const collections = ['faculties', 'departments', 'programs', 'courses', 'students', 'staff'];
        
        for (const col of collections) {
            const list = await pb.collection(col).getList(1, 2);
            console.log(`\n--- Collection: ${col} (Total: ${list.totalItems}) ---`);
            console.log(JSON.stringify(list.items, null, 2));
        }
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

inspect();
